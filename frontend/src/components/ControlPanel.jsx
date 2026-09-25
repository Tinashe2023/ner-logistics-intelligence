import { useState } from "react";

const LOCATIONS = ["guwahati", "tezpur", "bomdila", "dirang", "tawang"];

export default function ControlPanel({ riskMapData, onRequestRoute, routeComparison, loading, onReset }) {
  const [origin, setOrigin] = useState("guwahati");
  const [destination, setDestination] = useState("tawang");

  const highRiskCount = riskMapData?.hotspots?.filter((h) => h.risk_score > 0.3).length ?? 0;

  return (
    <div style={{ padding: "1rem", background: "#1a1a2e", color: "white", minWidth: "300px" }}>
      <h2 style={{ marginTop: 0 }}>Network Status</h2>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <KPI label="High-Risk Segments" value={highRiskCount} color="#e74c3c" />
        <KPI label="Corridor Length" value="~410 km" color="#2980b9" />
      </div>

      <h3>Plan a Route</h3>
      <label>
        Origin
        <select value={origin} onChange={(e) => setOrigin(e.target.value)} style={selectStyle}>
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <label>
        Destination
        <select value={destination} onChange={(e) => setDestination(e.target.value)} style={selectStyle}>
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <button
        onClick={() => onRequestRoute(origin, destination)}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? "Calculating..." : "Compare Routes"}
      </button>

      {routeComparison && (
        <button onClick={onReset} style={{ ...buttonStyle, background: "#555", marginTop: "0.5rem" }}>
          Reset — show full risk map
        </button>
      )}

      {routeComparison && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Route Comparison</h3>
          <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th></th>
                <th style={{ color: "#2980b9" }}>Risk-Aware</th>
                <th style={{ color: "#95a5a6" }}>Baseline</th>
              </tr>
            </thead>
            <tbody>
              <StatRow label="Distance" a={`${routeComparison.risk_aware_route.stats.distance_km} km`} b={`${routeComparison.baseline_route.stats.distance_km} km`} />
              <StatRow label="Time" a={`${routeComparison.risk_aware_route.stats.travel_time_min} min`} b={`${routeComparison.baseline_route.stats.travel_time_min} min`} />
              <StatRow label="Risk Exposure" a={routeComparison.risk_aware_route.stats.total_risk_exposure} b={routeComparison.baseline_route.stats.total_risk_exposure} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: "0.75rem", background: "#16213e", borderRadius: "6px" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#aaa" }}>{label}</div>
    </div>
  );
}

function StatRow({ label, a, b }) {
  return (
    <tr>
      <td style={{ padding: "0.3rem 0" }}>{label}</td>
      <td style={{ textAlign: "center" }}>{a}</td>
      <td style={{ textAlign: "center" }}>{b}</td>
    </tr>
  );
}

const selectStyle = {
  display: "block",
  width: "100%",
  margin: "0.25rem 0 0.75rem 0",
  padding: "0.4rem",
};

const buttonStyle = {
  width: "100%",
  padding: "0.6rem",
  background: "#2980b9",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
