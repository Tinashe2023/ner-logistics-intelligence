import { useEffect, useMemo, useState } from "react";
import RiskMap from "../components/RiskMap";
import { fetchCorridorWeather, fetchIncidents, fetchRiskMap, fetchRoute } from "../api";
import { getSavedLanguage, incidentStatusText, incidentTypeText, saveLanguage, t } from "../i18n";
import "../styles/dashboard.css";

const LOCATIONS = ["guwahati", "tezpur", "bomdila", "dirang", "tawang"];
const DEMO_RAIN_ALERT_MM_6H = 20;
const DEMO_RAIN_PROBABILITY_ALERT_PERCENT = 70;

export default function Dashboard() {
  const [riskMapData, setRiskMapData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [simulationClock, setSimulationClock] = useState(Date.now());
  const [language, setLanguage] = useState(getSavedLanguage);
  const [routeComparison, setRouteComparison] = useState(null);
  const [incidentsUpdatedAt, setIncidentsUpdatedAt] = useState(null);
  const [origin, setOrigin] = useState("guwahati");
  const [destination, setDestination] = useState("tawang");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRiskMap().then(setRiskMapData).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSimulationClock(Date.now()), 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshWeather() {
      try {
        const result = await fetchCorridorWeather();
        if (active) {
          setWeather(result);
          setWeatherError(null);
        }
      } catch (err) {
        if (active) setWeatherError(err.message);
      }
    }
    refreshWeather();
    const timer = window.setInterval(refreshWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshIncidents() {
      try {
        const rows = await fetchIncidents();
        if (active) {
          setIncidents(rows);
          setIncidentsUpdatedAt(new Date());
        }
      } catch {
        // Keep the last successful list visible if the API is temporarily unavailable.
      }
    }

    refreshIncidents();
    const timer = window.setInterval(refreshIncidents, 10000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") refreshIncidents();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  const highRiskCount = useMemo(
    () => riskMapData?.hotspots?.filter((item) => item.risk_score >= 0.3).length ?? 0,
    [riskMapData],
  );
  const pendingCount = incidents.filter((item) => item.status === "pending").length;
  const sortedIncidents = [...incidents].sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
  const topFactors = riskMapData?.hotspots?.[0]?.factors?.slice(0, 4) ?? [];
  const alerts = buildDemoAlerts(riskMapData, incidents, weather, language);
  const vehiclePath = routeComparison?.risk_aware_route?.path?.map((point) => [point.lat, point.lon])
    ?? (riskMapData?.spine?.length ? [
      ...riskMapData.spine.map((segment) => [segment.u_lat, segment.u_lon]),
      [riskMapData.spine.at(-1).v_lat, riskMapData.spine.at(-1).v_lon],
    ] : []);
  const simulatedVehicle = getSimulatedVehicle(vehiclePath, simulationClock);

  async function handleRouteSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setRouteComparison(await fetchRoute(origin, destination));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const routeStats = routeComparison?.risk_aware_route?.stats;

  return (
    <main className="command-shell">
      <header className="command-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">NE</div>
          <div>
            <div className="eyebrow">REGIONAL LOGISTICS INTELLIGENCE</div>
            <h1>Situation Room <span> / Command Center</span></h1>
          </div>
        </div>
        <div className="header-meta">
          <div className="corridor-label"><span className="live-dot" /> Prototype environment <span className="meta-divider">|</span> NER corridor demo</div>
          <a className="header-link" href="/driver">Open field reporting <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <div className="demo-notice"><span className="notice-icon">i</span><span><strong>Demonstration data</strong> · Vehicle position is simulated. Weather is forecast-model context at four fixed points; corridor risk uses a prototype heuristic and does not include weather.</span></div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="metric-grid" aria-label="Corridor summary">
        <MetricCard label="Monitored corridor" value="410" unit="km" detail="Guwahati — Tawang" icon="↗" tone="blue" />
        <MetricCard label="Elevated risk segments" value={riskMapData ? String(highRiskCount).padStart(2, "0") : "—"} unit="" detail="From top mapped hotspots" icon="△" tone="amber" />
        <MetricCard label="Reports awaiting review" value={String(pendingCount).padStart(2, "0")} unit="" detail="Field submissions" icon="◷" tone="violet" />
        <MetricCard label="Vehicle tracking" value="01" unit="" detail="Simulated marker · no GPS feed" icon="⌖" tone="muted" />
      </section>

      <section className="panel weather-panel" aria-label="Corridor weather">
        <div className="panel-heading weather-heading">
          <div><div className="eyebrow">ENVIRONMENTAL CONTEXT</div><h2>Corridor weather snapshot</h2></div>
          <div className="weather-source">{(weather?.stale || weatherError) && <span className="stale-label">{weatherError ? "REFRESH FAILED" : "STALE"}</span>}<span>{weather?.source || "Open-Meteo"}</span><span className="weather-separator">·</span><span>{weather?.retrieved_at ? `Retrieved ${formatClock(weather.retrieved_at)}` : weatherError ? "Unavailable" : "Loading…"}</span></div>
        </div>
        {weather?.points?.length ? <div className="weather-grid">{weather.points.map((point) => {
          const sixHourRain = point.forecast_precipitation_mm?.slice(0, 6).reduce((sum, value) => sum + (Number(value) || 0), 0);
          const maxProbability = Math.max(0, ...(point.forecast_precipitation_probability_percent || []).slice(0, 6).map(Number));
          return <div className="weather-point" key={point.name}>
            <div className="weather-location"><span className="weather-glyph">{weatherGlyph(point.weather_code)}</span><strong>{point.name}</strong></div>
            <div className="weather-temperature">{point.temperature_c == null ? "—" : `${Math.round(point.temperature_c)}°`}<span>C</span></div>
            <div className="weather-stats"><span><b>Rain now</b>{point.precipitation_mm ?? "—"} mm</span><span><b>Next 6h</b>{sixHourRain == null ? "—" : `${sixHourRain.toFixed(1)} mm`}</span><span><b>Rain chance</b>{point.forecast_precipitation_probability_percent?.length ? `${maxProbability}%` : "—"}</span></div>
            <div className="weather-model-time">{weatherLabel(point.weather_code)} · model time {point.current_time ? formatClock(point.current_time) : "—"}</div>
          </div>;
        })}</div> : <div className="weather-unavailable">{weatherError ? `${weatherError}. The rest of the dashboard remains available.` : "Loading weather context for the demo corridor…"}</div>}
        <div className="weather-disclaimer">Forecast-model context only · not a road observation · not currently included in route risk scores.</div>
      </section>

      <section className="main-grid">
        <article className="panel map-panel">
          <div className="panel-heading map-heading">
            <div><div className="eyebrow">NETWORK OVERVIEW</div><h2>Corridor accessibility</h2></div>
            <div className="map-status"><span className="status-dot" /> Static network data</div>
          </div>
          <div className="map-frame">
            {riskMapData ? <RiskMap riskMapData={riskMapData} routeComparison={routeComparison} simulatedVehicle={simulatedVehicle} /> : <div className="map-loading">Loading corridor map…</div>}
            <div className="map-caption"><span className="legend-line legend-risk" /> Risk-aware route <span className="legend-line legend-base" /> Distance baseline <span className="legend-pin" /> Risk hotspot <span className="vehicle-legend" /> Simulated vehicle</div>
          </div>
          <div className="map-footer"><span>Guwahati → Tawang corridor</span><span>Map data: OpenStreetMap · <span className="muted">availability is not live-verified</span></span></div>
        </article>

        <aside className="side-stack">
          <article className="panel route-panel">
            <div className="panel-heading"><div><div className="eyebrow">DISPATCH PLANNING</div><h2>Compare routes</h2></div><span className="panel-icon">⌁</span></div>
            <form className="route-form" onSubmit={handleRouteSubmit}>
              <label>Origin<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{LOCATIONS.map((place) => <option key={place} value={place}>{titleCase(place)}</option>)}</select></label>
              <div className="route-connector" aria-hidden="true"><span /></div>
              <label>Destination<select value={destination} onChange={(event) => setDestination(event.target.value)}>{LOCATIONS.map((place) => <option key={place} value={place}>{titleCase(place)}</option>)}</select></label>
              <button className="primary-button" type="submit" disabled={loading || origin === destination}>{loading ? "Calculating route…" : "Calculate route comparison"}<span aria-hidden="true">→</span></button>
            </form>
            {routeStats ? <div className="route-result">
              <div className="result-title"><span className="result-dot" /> Risk-aware option <span className="prototype-tag">HEURISTIC</span></div>
              <div className="result-metrics"><div><strong>{routeStats.distance_km}</strong><span>km</span></div><div><strong>{Math.round(routeStats.travel_time_min / 60)}h {Math.round(routeStats.travel_time_min % 60)}m</strong><span>estimated</span></div><div><strong>{routeStats.total_risk_exposure}</strong><span>risk exposure</span></div></div>
              <button type="button" className="text-button" onClick={() => setRouteComparison(null)}>Clear comparison</button>
            </div> : <p className="panel-hint">Compare the prototype risk-aware path with the shortest-distance route.</p>}
          </article>

          <article className="panel alerts-panel" lang={language === "hi" ? "hi" : "en"}>
            <div className="panel-heading"><div><div className="eyebrow">{t(language, "demoAlertLabel")}</div><h2>{t(language, "situationAlerts")} <span className="count-pill">{alerts.length}</span></h2></div><div className="alert-heading-actions"><button type="button" className="language-toggle" aria-label={t(language, "language")} aria-pressed={language === "hi"} onClick={() => setLanguage(saveLanguage(language === "en" ? "hi" : "en"))}>{language === "en" ? "हिन्दी" : "English"}</button><span className="refresh-indicator" title={incidentsUpdatedAt ? `Reports last updated ${incidentsUpdatedAt.toLocaleTimeString()}` : "Waiting for incident data"}><span className="refresh-dot" />{t(language, "autoTenSeconds")}</span></div></div>
            {alerts.length ? <div className="alert-list">{alerts.slice(0, 5).map((alert) => <div className="alert-row" key={alert.id}>
              <span className={`alert-symbol alert-${alert.level}`}>{alert.level === "high" ? "!" : "•"}</span>
              <div className="alert-copy"><strong>{alert.title}</strong><span>{alert.detail}</span></div>
              <span className={`alert-tag alert-tag-${alert.kind}`}>{alert.kindLabel}</span>
            </div>)}</div> : <div className="empty-alerts"><strong>{t(language, "noAlerts")}</strong><span>{t(language, "noAlertsHelp")}</span></div>}
            <div className="reports-subheading"><span>{t(language, "recentReports")}</span><span className="count-pill">{incidents.length}</span></div>
            {sortedIncidents.length ? <div className="incident-list">{sortedIncidents.slice(0, 4).map((item) => <div className="incident-row" key={item.id}>
              <span className={`severity-mark severity-${item.severity}`} />
              <div className="incident-copy"><strong>{incidentTypeText(language, item.type)}</strong><span>{item.description || `${Number(item.lat).toFixed(3)}, ${Number(item.lon).toFixed(3)}`}</span></div>
              <span className={`status-chip status-${item.status}`}>{incidentStatusText(language, item.status)}</span>
            </div>)}</div> : <div className="empty-state"><span className="empty-icon">◎</span><strong>{t(language, "noReports")}</strong><span>{t(language, "reportsHelp")}</span></div>}
            <div className="panel-footnote"><span className="small-dot" /> {t(language, "pendingReviewCount", { count: pendingCount })}</div>
          </article>
        </aside>
      </section>

      <section className="lower-grid">
        <article className="panel lower-panel">
          <div className="panel-heading"><div><div className="eyebrow">RISK MODEL · PROTOTYPE</div><h2>Factors behind mapped risk</h2></div><span className="panel-icon">⌁</span></div>
          {topFactors.length ? <div className="factor-list">{topFactors.map((factor, index) => <div className="factor-row" key={factor.factor}><div className="factor-label"><span className="factor-index">0{index + 1}</span><span>{factor.label}</span><strong>{factor.percent}%</strong></div><div className="factor-track"><span style={{ width: `${factor.percent}%` }} /></div></div>)}</div> : <div className="empty-inline">Risk factor data is unavailable.</div>}
          <p className="fine-print">These are weighted heuristic contributions, not measured probabilities or validated predictions.</p>
        </article>
        <article className="panel lower-panel fleet-panel">
          <div className="panel-heading"><div><div className="eyebrow">MOVEMENT VISIBILITY</div><h2>Vehicle status</h2></div><span className="unavailable-chip">SIMULATED</span></div>
          <div className="fleet-empty"><div className="fleet-icon">⌖</div><div><strong>TRK-DEMO-01 · In transit</strong><span>Demo cargo: medical supplies · follows the selected corridor route.</span></div></div>
          <div className="fleet-summary"><span>Route progress · demo only</span><strong>{simulatedVehicle ? `${simulatedVehicle.progress}%` : "Waiting for route data"}</strong></div>
        </article>
        <article className="panel lower-panel next-panel">
          <div className="panel-heading"><div><div className="eyebrow">OPERATIONS QUEUE</div><h2>Next actions</h2></div><span className="panel-icon">↗</span></div>
          <div className="action-list"><a href="/driver" className="action-row"><span className="action-number">01</span><span><strong>Submit a field report</strong><small>Share a road condition update</small></span><b>→</b></a><a href="http://localhost:8080/incidents.php" className="action-row"><span className="action-number">02</span><span><strong>Review pending reports</strong><small>Open dispatcher review panel</small></span><b>↗</b></a></div>
          <p className="fine-print">Dashboard-only demo alerts; no SMS/push notifications or delivery tracking.</p>
        </article>
      </section>
      <footer className="command-footer"><span>NER Logistics Intelligence · SIH 26002 class prototype</span><span>Decision support demonstration · verify conditions with local authorities</span></footer>
    </main>
  );
}

function MetricCard({ label, value, unit, detail, icon, tone }) {
  return <article className="metric-card"><div className={`metric-icon tone-${tone}`}>{icon}</div><div className="metric-copy"><span>{label}</span><div className="metric-value">{value}<small>{unit}</small></div><small className="metric-detail">{detail}</small></div></article>;
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildDemoAlerts(riskMapData, incidents, weather, language) {
  const alerts = [];
  for (const report of incidents) {
    if (report.type === "road_blockage" && report.status === "approved") {
      alerts.push({
        id: `blockage-${report.id}`,
        level: "high",
        kind: "reviewed",
        kindLabel: t(language, "reviewed"),
        title: t(language, "blockageAlert", { id: report.id }),
        detail: t(language, "reviewedBlockageDetail"),
      });
    } else if (report.status === "pending" && report.severity === "severe") {
      alerts.push({
        id: `pending-${report.id}`,
        level: "high",
        kind: "review",
        kindLabel: t(language, "review"),
        title: t(language, "severeReportAlert", { id: report.id }),
        detail: t(language, "waitingReview", { type: incidentTypeText(language, report.type) }),
      });
    }
  }

  for (const hotspot of (riskMapData?.hotspots || []).filter((item) => item.risk_score >= 0.45).slice(0, 3)) {
    alerts.push({
      id: `risk-${hotspot.lat}-${hotspot.lon}`,
      level: "high",
      kind: "model",
      kindLabel: t(language, "heuristic"),
      title: t(language, "highRiskAlert", { name: hotspot.osm_name }),
      detail: t(language, "highRiskDetail", { score: Number(hotspot.risk_score).toFixed(2) }),
    });
  }

  if (weather && !weather.stale) {
    for (const point of weather.points || []) {
      const sixHourRain = (point.forecast_precipitation_mm || []).slice(0, 6).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const rainChance = Math.max(0, ...(point.forecast_precipitation_probability_percent || []).slice(0, 6).map(Number));
      if (sixHourRain >= DEMO_RAIN_ALERT_MM_6H || rainChance >= DEMO_RAIN_PROBABILITY_ALERT_PERCENT) {
        alerts.push({
          id: `weather-${point.name}`,
          level: "medium",
          kind: "forecast",
          kindLabel: t(language, "forecast"),
          title: t(language, "heavyRainAlert", { name: point.name }),
          detail: t(language, "heavyRainDetail", { amount: sixHourRain.toFixed(1), chance: rainChance }),
        });
      }
    }
  }
  return alerts.sort((left, right) => (left.level === "high" ? -1 : 1) - (right.level === "high" ? -1 : 1));
}

function formatClock(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function weatherLabel(code) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Conditions unavailable";
}

function weatherGlyph(code) {
  if ([95, 96, 99].includes(code)) return "ϟ";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "⌁";
  if ([45, 48, 1, 2, 3].includes(code)) return "☁";
  return "☼";
}

function getSimulatedVehicle(path, now) {
  if (!path || path.length < 2) return null;
  const progress = ((now / 90000) % 1) * (path.length - 1);
  const segmentIndex = Math.floor(progress);
  const segmentProgress = progress - segmentIndex;
  const start = path[segmentIndex];
  const end = path[Math.min(segmentIndex + 1, path.length - 1)];
  return {
    lat: start[0] + (end[0] - start[0]) * segmentProgress,
    lon: start[1] + (end[1] - start[1]) * segmentProgress,
    progress: Math.round((progress / (path.length - 1)) * 100),
  };
}
