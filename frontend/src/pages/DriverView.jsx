import { useEffect, useState } from "react";
import { fetchRoute, reportIncident } from "../api";

// A few known points along the corridor for quick demo reporting —
// real GPS input would replace this in a native app, but for a web
// demo, picking a known spot is faster than typing coordinates.
const QUICK_LOCATIONS = {
  "Near Guwahati (confirmed chokepoint)": { lat: 26.3871, lon: 91.7336 },
  "Tenga Valley": { lat: 27.15, lon: 92.47 },
  "Nechiphu Pass": { lat: 27.24, lon: 92.4 },
  "Sela Pass": { lat: 27.5073, lon: 92.0827 },
  "Dirang-Tawang stretch": { lat: 27.4, lon: 92.1 },
};

export default function DriverView() {
  const [route, setRoute] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queue, setQueue] = useState([]); // reports made while "offline"
  const [syncMessage, setSyncMessage] = useState(null);
  const [form, setForm] = useState({
    location: "Tenga Valley",
    type: "landslide",
    severity: "moderate",
    description: "",
  });

  useEffect(() => {
    fetchRoute("guwahati", "tawang").then((data) =>
      setRoute(data.risk_aware_route.stats),
    );
  }, []);

  async function handleSubmitReport(e) {
    e.preventDefault();
    const { lat, lon } = QUICK_LOCATIONS[form.location];
    const report = {
      lat,
      lon,
      type: form.type,
      severity: form.severity,
      description: form.description,
    };

    if (isOffline) {
      // Store-and-forward: queue locally, nothing sent until back online.
      setQueue((q) => [...q, report]);
      setSyncMessage(null);
    } else {
      try {
        await reportIncident(report);
        setSyncMessage("Report sent — awaiting dispatcher review.");
      } catch (err) {
        setSyncMessage(`Failed to send: ${err.message}`);
      }
    }
    setForm((f) => ({ ...f, description: "" }));
  }

  async function handleGoOnline() {
    setIsOffline(false);
    if (queue.length === 0) return;

    let synced = 0;
    for (const report of queue) {
      try {
        await reportIncident(report);
        synced++;
      } catch (err) {
        // one failed sync shouldn't block the rest — keep going
      }
    }
    setQueue([]);
    setSyncMessage(
      `Back online — synced ${synced} queued report(s) to dispatch.`,
    );
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          padding: "0.6rem",
          borderRadius: "6px",
          textAlign: "center",
          marginBottom: "1rem",
          background: isOffline ? "#7f8c8d" : "#27ae60",
          color: "white",
          fontWeight: "bold",
        }}
      >
        {isOffline ? "OFFLINE — reports will queue locally" : "ONLINE"}
      </div>

      <button
        onClick={() => (isOffline ? handleGoOnline() : setIsOffline(true))}
        style={{
          width: "100%",
          padding: "0.6rem",
          marginBottom: "1rem",
          cursor: "pointer",
        }}
      >
        {isOffline
          ? "Simulate: Back Online (sync queue)"
          : "Simulate: Go Offline"}
      </button>

      <h3>Assigned Route: Guwahati → Tawang</h3>
      {route ? (
        <ul style={{ fontSize: "0.9rem", color: "#333" }}>
          <li>Distance: {route.distance_km} km</li>
          <li>Est. time: {route.travel_time_min} min</li>
          <li>Risk exposure: {route.total_risk_exposure}</li>
        </ul>
      ) : (
        <p>Loading route...</p>
      )}

      <h3>Report an Incident</h3>
      <form onSubmit={handleSubmitReport}>
        <label>Location</label>
        <select
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          style={inputStyle}
        >
          {Object.keys(QUICK_LOCATIONS).map((loc) => (
            <option key={loc}>{loc}</option>
          ))}
        </select>

        <label>Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={inputStyle}
        >
          <option value="landslide">Landslide</option>
          <option value="flood">Flood</option>
          <option value="road_damage">Road damage</option>
          <option value="other">Other</option>
        </select>

        <label>Severity</label>
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          style={inputStyle}
        >
          <option value="minor">Minor</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>

        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ ...inputStyle, height: "60px" }}
        />

        <button
          type="submit"
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
          {isOffline ? "Save Report (offline)" : "Send Report"}
        </button>
      </form>

      {syncMessage && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.6rem",
            background: "#eef1f5",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        >
          {syncMessage}
        </div>
      )}

      {queue.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Queued (not yet sent) — {queue.length}</h4>
          <ul style={{ fontSize: "0.85rem", color: "#666" }}>
            {queue.map((r, i) => (
              <li key={i}>
                {r.type} — {r.severity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "0.4rem",
  margin: "0.25rem 0 0.75rem 0",
  boxSizing: "border-box",
};
