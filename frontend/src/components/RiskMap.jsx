import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
const cartoTileUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoApiKey ? `?key=${encodeURIComponent(cartoApiKey)}` : ""}`;

function riskColor(risk) {
  if (risk < 0.15) return "#39d4a0";
  if (risk < 0.3) return "#e7bb4b";
  if (risk < 0.45) return "#ec8548";
  return "#f05f69";
}

export default function RiskMap({ riskMapData, routeComparison, simulatedVehicle }) {
  return (
    <MapContainer center={[26.9, 92.0]} zoom={7} scrollWheelZoom className="risk-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={cartoTileUrl}
      />
      {!routeComparison && riskMapData?.spine?.map((segment, index) => (
        <Polyline key={`spine-${index}`} positions={[[segment.u_lat, segment.u_lon], [segment.v_lat, segment.v_lon]]} pathOptions={{ color: riskColor(segment.risk_score), weight: 4, opacity: 0.9 }}>
          <Popup><strong>{segment.osm_name}</strong><br />Prototype risk score: {segment.risk_score.toFixed(3)}</Popup>
        </Polyline>
      ))}
      {riskMapData?.hotspots?.map((hotspot, index) => (
        <CircleMarker key={`hotspot-${index}`} center={[hotspot.lat, hotspot.lon]} radius={6 + hotspot.risk_score * 8} pathOptions={{ color: "#ffb5aa", weight: 1.5, fillColor: riskColor(hotspot.risk_score), fillOpacity: 0.82 }}>
          <Popup><strong>{hotspot.osm_name}</strong><br />Prototype risk score: {hotspot.risk_score.toFixed(3)}{hotspot.factors && <div className="map-popup-factors">{hotspot.factors.slice(0, 3).map((factor) => <div key={factor.factor}>{factor.label}: {factor.percent}%</div>)}</div>}</Popup>
        </CircleMarker>
      ))}
      {routeComparison && <>
        <Polyline positions={routeComparison.baseline_route.path.map((point) => [point.lat, point.lon])} pathOptions={{ color: "#bac5d3", weight: 3, dashArray: "7 8", opacity: 0.8 }} />
        <Polyline positions={routeComparison.risk_aware_route.path.map((point) => [point.lat, point.lon])} pathOptions={{ color: "#59b8ff", weight: 5, opacity: 0.96 }} />
      </>}
      {simulatedVehicle && <CircleMarker center={[simulatedVehicle.lat, simulatedVehicle.lon]} radius={8} pathOptions={{ color: "#d9f2ff", weight: 2, fillColor: "#57b8f5", fillOpacity: 1 }}>
        <Popup><strong>TRK-DEMO-01</strong><br />Simulated vehicle marker<br />Medical supplies · {simulatedVehicle.progress}% route progress</Popup>
      </CircleMarker>}
    </MapContainer>
  );
}
