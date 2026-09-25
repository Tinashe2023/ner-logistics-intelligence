import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Risk score (0-1) -> color, green (safe) through to red (high risk).
function riskColor(risk) {
  if (risk < 0.15) return "#2ecc71";   // green
  if (risk < 0.3) return "#f1c40f";    // yellow
  if (risk < 0.45) return "#e67e22";   // orange
  return "#e74c3c";                     // red
}

export default function RiskMap({ riskMapData, routeComparison }) {
  const center = [26.9, 92.0]; // roughly the middle of the Guwahati-Tawang corridor

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={center} zoom={7} style={{ height: "600px", width: "100%" }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Base risk spine — only shown when there's no active route comparison,
          to avoid cluttering the map with two overlapping route sets. */}
      {!routeComparison && riskMapData?.spine?.map((seg, i) => (
        <Polyline
          key={`spine-${i}`}
          positions={[[seg.u_lat, seg.u_lon], [seg.v_lat, seg.v_lon]]}
          pathOptions={{ color: riskColor(seg.risk_score), weight: 4 }}
        >
          <Popup>
            {seg.osm_name}<br />
            Risk: {seg.risk_score.toFixed(3)}
          </Popup>
        </Polyline>
      ))}

      {/* High-risk hotspots, always shown */}
      {riskMapData?.hotspots?.map((h, i) => (
        <CircleMarker
          key={`hotspot-${i}`}
          center={[h.lat, h.lon]}
          radius={6 + h.risk_score * 10}
          pathOptions={{ color: "#c0392b", fillColor: "#e74c3c", fillOpacity: 0.7 }}
        >
          <Popup>
            {h.osm_name}<br />
            Risk: {h.risk_score.toFixed(3)}
          </Popup>
        </CircleMarker>
      ))}

      {/* Route comparison, when active: risk-aware drawn first (thick blue),
          baseline drawn AFTER so its dashed line is visible on top even
          where the two paths nearly overlap — previously baseline was
          drawn first and got fully hidden underneath the solid blue line. */}
      {routeComparison && (
        <>
          <Polyline
            positions={routeComparison.risk_aware_route.path.map((p) => [p.lat, p.lon])}
            pathOptions={{ color: "#2980b9", weight: 6 }}
          />
          <Polyline
            positions={routeComparison.baseline_route.path.map((p) => [p.lat, p.lon])}
            pathOptions={{ color: "#2c3e50", weight: 3, dashArray: "8 8" }}
          />
        </>
      )}
    </MapContainer>

      <div style={legendStyle}>
        {!routeComparison ? (
          <>
            <div style={{ fontWeight: "bold", marginBottom: "0.3rem" }}>Risk level</div>
            <LegendRow color="#2ecc71" label="Low (< 0.15)" />
            <LegendRow color="#f1c40f" label="Moderate (0.15-0.3)" />
            <LegendRow color="#e67e22" label="Elevated (0.3-0.45)" />
            <LegendRow color="#e74c3c" label="High (> 0.45)" />
          </>
        ) : (
          <>
            <div style={{ fontWeight: "bold", marginBottom: "0.3rem" }}>Route comparison</div>
            <LegendRow color="#2980b9" label="Risk-aware route" line />
            <LegendRow color="#2c3e50" label="Baseline (shortest) route" line dashed />
          </>
        )}
        <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#666" }}>
          Red circles: top 20 highest-risk segments
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, line, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
      {line ? (
        <div style={{
          width: "18px", height: dashed ? "0px" : "4px",
          borderTop: dashed ? `3px dashed ${color}` : "none",
          background: dashed ? "none" : color,
        }} />
      ) : (
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: color }} />
      )}
      <span>{label}</span>
    </div>
  );
}

const legendStyle = {
  position: "absolute",
  bottom: "20px",
  right: "10px",
  background: "white",
  padding: "0.6rem 0.8rem",
  borderRadius: "6px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  zIndex: 1000,
};
