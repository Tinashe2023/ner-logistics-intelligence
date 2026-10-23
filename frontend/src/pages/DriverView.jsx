import { useCallback, useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { checkApiHealth, fetchRoute, reportIncident, uploadIncidentPhoto } from "../api";
import { getSavedLanguage, incidentTypeText, locationText, saveLanguage, t } from "../i18n";
import { readQueuedReports, replaceQueuedReports } from "../offlineQueue";

// A few known points along the corridor for quick demo reporting —
// real GPS input would replace this in a native app, but for a web
// demo, picking a known spot is faster than typing coordinates.
const QUICK_LOCATIONS = {
  "Near Guwahati": { lat: 26.3871, lon: 91.7336 },
  "Tenga Valley": { lat: 27.15, lon: 92.47 },
  "Nechiphu Pass": { lat: 27.24, lon: 92.4 },
  "Sela Pass": { lat: 27.5073, lon: 92.0827 },
  "Dirang-Tawang stretch": { lat: 27.4, lon: 92.1 },
};

function makeLocalId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DriverView() {
  const [route, setRoute] = useState(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [apiAvailable, setApiAvailable] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueReady, setQueueReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [coordinates, setCoordinates] = useState(QUICK_LOCATIONS["Tenga Valley"]);
  const [language, setLanguage] = useState(getSavedLanguage);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [form, setForm] = useState({
    location: "Tenga Valley",
    type: "landslide",
    severity: "moderate",
    description: "",
  });

  useEffect(() => {
    fetchRoute("guwahati", "tawang").then((data) =>
      setRoute(data.risk_aware_route.stats),
    ).catch(() => setRoute(null));
  }, []);

  useEffect(() => {
    let active = true;
    const refreshApiStatus = async () => {
      const available = await checkApiHealth();
      if (active) setApiAvailable(available);
    };
    refreshApiStatus();
    const timer = window.setInterval(refreshApiStatus, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    readQueuedReports()
      .then((reports) => { if (active) setQueue(reports); })
      .catch(() => { if (active) setSyncMessage(t(language, "storageFailed")); })
      .finally(() => { if (active) setQueueReady(true); });
    return () => { active = false; };
  }, [language]);

  const persistQueue = useCallback(async (nextQueue) => {
    await replaceQueuedReports(nextQueue);
    setQueue(nextQueue);
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing || !queueReady || queue.length === 0) return;
    setIsSyncing(true);
    const sentIds = new Set();
    const remaining = [];
    let lastError = null;
    try {
      for (const report of queue) {
        try {
          // A report whose photo upload failed was already accepted by the API.
          // Retry only its remaining photos instead of posting the incident again.
          const incident = report.incidentId
            ? { incident_id: report.incidentId }
            : await reportIncident(report);
          setApiAvailable(true);
          const failedPhotos = [];
          for (const photo of report.photos || []) {
            try {
              await uploadIncidentPhoto(incident.incident_id, photo);
            } catch (error) {
              lastError = error.message;
              failedPhotos.push(photo);
            }
          }
          if (failedPhotos.length) {
            remaining.push({ ...report, photos: failedPhotos, incidentId: incident.incident_id });
          } else {
            sentIds.add(report.localId);
          }
        } catch (error) {
          lastError = error.message;
          remaining.push(report);
        }
      }
      try {
        await persistQueue(remaining);
        const summary = remaining.length === 0
          ? t(language, "synced", { count: sentIds.size })
          : t(language, "partiallySynced", { sent: sentIds.size, remaining: remaining.length });
        setSyncMessage(lastError ? `${summary} ${t(language, "lastSyncError", { error: lastError })}` : summary);
      } catch {
        const retained = [...remaining, ...queue.filter((report) => !remaining.some((item) => item.localId === report.localId))];
        setQueue(retained);
        setSyncMessage(t(language, "storageFailed"));
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, language, persistQueue, queue, queueReady]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncQueue();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  async function handleSubmitReport(e) {
    e.preventDefault();
    const photos = selectedPhotos.map((file) => ({
      localId: makeLocalId(),
      name: file.name,
      type: file.type,
      blob: file,
    }));
    const report = {
      localId: makeLocalId(),
      lat: coordinates.lat,
      lon: coordinates.lon,
      type: form.type,
      severity: form.severity,
      description: form.description,
      photos,
    };

    if (isOffline || !navigator.onLine || apiAvailable === false) {
      try {
        await persistQueue([...queue, report]);
        setSyncMessage(t(language, "reportSaved"));
      } catch {
        setSyncMessage(t(language, "storageFailed"));
        return;
      }
    } else {
      try {
        const result = await reportIncident(report);
        setApiAvailable(true);
        const failedPhotos = [];
        for (const photo of photos) {
          try {
            await uploadIncidentPhoto(result.incident_id, photo);
          } catch (error) {
            setSyncMessage(t(language, "photoQueuedError", { count: photos.length, error: error.message }));
            failedPhotos.push(photo);
          }
        }
        if (failedPhotos.length) {
          await persistQueue([...queue, { ...report, photos: failedPhotos, incidentId: result.incident_id }]);
          setSyncMessage(t(language, "photoQueued", { count: failedPhotos.length }));
        } else {
          setSyncMessage(t(language, "reportSent"));
        }
      } catch (err) {
        try {
          await persistQueue([...queue, report]);
          setSyncMessage(`${t(language, "connectionFailed")} (${err.message})`);
        } catch {
          setSyncMessage(t(language, "storageFailed"));
          return;
        }
      }
    }
    setSelectedPhotos([]);
    setForm((f) => ({ ...f, description: "" }));
  }

  function handlePhotoSelection(event) {
    const files = Array.from(event.target.files || []);
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (files.length > 3 || files.some((file) => !allowed.has(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setSyncMessage(t(language, "photoLimitError"));
      event.target.value = "";
      setSelectedPhotos([]);
      return;
    }
    setSyncMessage(null);
    setSelectedPhotos(files);
  }

  async function handleGoOnline() {
    setIsOffline(false);
    if (navigator.onLine) await syncQueue();
    else setSyncMessage(t(language, "stillOffline"));
  }

  return (
    <main className="driver-view-shell" lang={language === "hi" ? "hi" : "en"}>
      <div className="driver-title-row">
        <div><div className="eyebrow">FIELD OPERATIONS</div><h2>{t(language, "driverTitle")}</h2><p>{t(language, "driverSubtitle")}</p></div>
        <button type="button" className="language-toggle" aria-label={t(language, "language")} aria-pressed={language === "hi"} onClick={() => setLanguage(saveLanguage(language === "en" ? "hi" : "en"))}>{language === "en" ? "हिन्दी" : "English"}</button>
      </div>
      <div className={`driver-connectivity ${isOffline || !navigator.onLine ? "is-offline" : "is-online"}`}>
        {isOffline || !navigator.onLine
          ? t(language, "offline")
          : isSyncing
            ? t(language, "syncing")
            : apiAvailable === false
              ? t(language, "backendUnavailable")
              : apiAvailable === null
                ? t(language, "checkingBackend")
                : t(language, "online")}
      </div>

      <button
        disabled={isSyncing || !queueReady}
        onClick={() => (isOffline ? handleGoOnline() : setIsOffline(true))}
        style={{
          width: "100%",
          padding: "0.6rem",
          marginBottom: "1rem",
          cursor: "pointer",
        }}
      >
        {isOffline
          ? isSyncing ? t(language, "syncing") : t(language, "backOnline")
          : t(language, "simulateOffline")}
      </button>

      <h3>{t(language, "assignedRoute")}</h3>
      {route ? (
        <ul className="driver-route-stats">
          <li>{t(language, "distance")}: {route.distance_km} km</li>
          <li>{t(language, "estimatedTime")}: {route.travel_time_min} min</li>
          <li>{t(language, "riskExposure")}: {route.total_risk_exposure}</li>
        </ul>
      ) : (
        <p>{t(language, "loadingRoute")}</p>
      )}

      <h3>{t(language, "reportIncident")}</h3>
      <form onSubmit={handleSubmitReport}>
        <label>{t(language, "location")}</label>
        <select
          value={form.location}
          onChange={(e) => {
            const location = e.target.value;
            setForm({ ...form, location });
            setCoordinates((previous) => QUICK_LOCATIONS[location] || previous);
          }}
          style={inputStyle}
        >
          {Object.keys(QUICK_LOCATIONS).map((loc) => (
            <option key={loc} value={loc}>{locationText(language, loc)}</option>
          ))}
          <option value="Custom map point">{t(language, "customMapPoint")}</option>
        </select>

        <label>{t(language, "pinLocation")} <span style={{ color: "#718399", fontWeight: "normal" }}>{t(language, "tapMap")}</span></label>
        <div className="report-map-wrap">
          <MapContainer center={[27.15, 92.15]} zoom={7} scrollWheelZoom={false} className="report-location-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationClickHandler onSelect={(point) => {
              setCoordinates(point);
              setForm((current) => ({ ...current, location: "Custom map point" }));
            }} />
            <CircleMarker center={[coordinates.lat, coordinates.lon]} radius={8} pathOptions={{ color: "#fff", weight: 2, fillColor: "#e74c3c", fillOpacity: 1 }} />
          </MapContainer>
        </div>
        <div className="report-coordinate-readout">{t(language, "selected")}: {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}</div>
        <p className="report-scope-note">{t(language, "scopeNote")}</p>

        <label>{t(language, "type")}</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={inputStyle}
        >
          <option value="landslide">{incidentTypeText(language, "landslide")}</option>
          <option value="flood">{incidentTypeText(language, "flood")}</option>
          <option value="road_damage">{incidentTypeText(language, "road_damage")}</option>
          <option value="road_blockage">{incidentTypeText(language, "road_blockage")}</option>
          <option value="other">{incidentTypeText(language, "other")}</option>
        </select>

        <label>{t(language, "severity")}</label>
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          style={inputStyle}
        >
          <option value="minor">{t(language, "minor")}</option>
          <option value="moderate">{t(language, "moderate")}</option>
          <option value="severe">{t(language, "severe")}</option>
        </select>

        <label>{t(language, "description")}</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ ...inputStyle, height: "60px" }}
        />

        <label>{t(language, "addPhotos")}</label>
        <input
          key={selectedPhotos.length ? "selected-photos" : "empty-photos"}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoSelection}
          style={{ ...inputStyle, padding: "0.55rem" }}
        />
        <p className="report-scope-note">{t(language, "photoHelp")}</p>
        {selectedPhotos.length > 0 && <p className="report-coordinate-readout">{t(language, "selectedPhotos")}: {selectedPhotos.map((file) => file.name).join(", ")}</p>}

        <button
          type="submit"
          disabled={!queueReady || isSyncing}
          style={{
            width: "100%",
            padding: "0.6rem",
            background: "#2980b9",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {!queueReady
            ? t(language, "preparingQueue")
            : isSyncing
              ? t(language, "syncingReports")
              : isOffline || !navigator.onLine
                ? t(language, "saveOffline")
                : t(language, "sendReport")}
        </button>
      </form>

      {syncMessage && (
        <div className="driver-sync-message">
          {syncMessage}
        </div>
      )}

      {queue.length > 0 && (
        <div className="driver-queue-panel">
          <h4>{t(language, "queueTitle")} — {queue.length}</h4>
          {!isOffline && navigator.onLine && (
            <button type="button" disabled={isSyncing} onClick={syncQueue}>
              {isSyncing ? t(language, "syncing") : t(language, "retryQueue")}
            </button>
          )}
          <ul className="driver-queue-list">
            {queue.map((r, i) => (
              <li key={r.localId || i}>
                {incidentTypeText(language, r.type)} — {t(language, r.severity)}
                {r.photos?.length ? ` · ${t(language, "queuedPhotos", { count: r.photos.length })}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "0.4rem",
  margin: "0.25rem 0 0.75rem 0",
  boxSizing: "border-box",
  color: "#dce7f2",
  background: "#0a121d",
  border: "1px solid #2b3b50",
  borderRadius: "5px",
};

function LocationClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: Number(event.latlng.lat.toFixed(5)), lon: Number(event.latlng.lng.toFixed(5)) });
    },
  });
  return null;
}
