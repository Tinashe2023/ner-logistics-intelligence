import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DEMO_SHIPMENTS, DEMO_SITUATIONS, REGIONAL_HUBS, REGIONAL_LINKS } from "../data/regionalDemo";

const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
const cartoTileUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoApiKey ? `?key=${encodeURIComponent(cartoApiKey)}` : ""}`;

function riskColor(risk) {
  if (risk < 0.15) return "#39d4a0";
  if (risk < 0.3) return "#e7bb4b";
  if (risk < 0.45) return "#ec8548";
  return "#f05f69";
}

export default function RiskMap({
  riskMapData,
  routeComparison,
  simulatedVehicle,
  regionalMode = false,
  simulationClock = Date.now(),
}) {
  return (
    <MapContainer
      key={regionalMode ? "regional-map" : "corridor-map"}
      center={regionalMode ? [25.45, 92.0] : [26.9, 92.0]}
      zoom={regionalMode ? 6.5 : 7}
      scrollWheelZoom
      className="risk-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={cartoTileUrl}
      />
      {regionalMode ? <>
        {REGIONAL_LINKS.map(({ from, to }) => (
          <Polyline key={`${from.id}-${to.id}`} positions={[[from.lat, from.lon], [to.lat, to.lon]]} pathOptions={{ color: "#9caec2", weight: 2, opacity: 0.62, dashArray: "5 8" }} />
        ))}
        {REGIONAL_HUBS.map((hub) => (
          <CircleMarker key={hub.id} center={[hub.lat, hub.lon]} radius={6} pathOptions={{ color: "#d4e4f4", weight: 2, fillColor: "#183957", fillOpacity: 1 }}>
            <Tooltip direction="right" offset={[8, 0]} permanent>{hub.state}</Tooltip>
            <Popup><strong>{hub.state}</strong><br />Regional hub: {hub.city}<br />Illustrative hub location</Popup>
          </CircleMarker>
        ))}
        {DEMO_SITUATIONS.map((scenario) => (
          <CircleMarker key={scenario.id} center={[scenario.lat, scenario.lon]} radius={8} pathOptions={{ color: "#ffe0a0", weight: 2, fillColor: scenario.level === "high" ? "#ed6870" : "#e6b84c", fillOpacity: 0.95 }}>
            <Popup><strong>{scenario.type}</strong><br />{scenario.state}<br />Class scenario</Popup>
          </CircleMarker>
        ))}
        {DEMO_SHIPMENTS.map((shipment) => {
          const progress = ((simulationClock / 12000 + shipment.offset) % 1);
          const from = REGIONAL_HUBS.find((hub) => hub.id === shipment.from);
          const to = REGIONAL_HUBS.find((hub) => hub.id === shipment.to);
          const lat = from.lat + (to.lat - from.lat) * progress;
          const lon = from.lon + (to.lon - from.lon) * progress;
          return <CircleMarker key={shipment.id} center={[lat, lon]} radius={6} pathOptions={{ color: "#d9f2ff", weight: 2, fillColor: "#57b8f5", fillOpacity: 1 }}>
            <Popup><strong>{shipment.id} · Demo shipment</strong><br />{shipment.cargo}<br />{from.city} → {to.city}<br />Movement trace for the class demo</Popup>
          </CircleMarker>;
        })}
      </> : <>
      {!routeComparison &&
        riskMapData?.spine?.map((segment, index) => (
          <Polyline
            key={`spine-${index}`}
            positions={[
              [segment.u_lat, segment.u_lon],
              [segment.v_lat, segment.v_lon],
            ]}
            pathOptions={{
              color: riskColor(segment.risk_score),
              weight: 4,
              opacity: 0.9,
            }}
          >
            <Popup>
              <strong>{segment.osm_name}</strong>
              <br />
              Prototype risk score: {segment.risk_score.toFixed(3)}
            </Popup>
          </Polyline>
        ))}
      {riskMapData?.hotspots?.map((hotspot, index) => (
        <CircleMarker
          key={`hotspot-${index}`}
          center={[hotspot.lat, hotspot.lon]}
          radius={6 + hotspot.risk_score * 8}
          pathOptions={{
            color: "#ffb5aa",
            weight: 1.5,
            fillColor: riskColor(hotspot.risk_score),
            fillOpacity: 0.82,
          }}
        >
          <Popup>
            <strong>{hotspot.osm_name}</strong>
            <br />
            Prototype risk score: {hotspot.risk_score.toFixed(3)}
            {hotspot.factors && (
              <div className="map-popup-factors">
                {hotspot.factors.slice(0, 3).map((factor) => (
                  <div key={factor.factor}>
                    {factor.label}: {factor.percent}%
                  </div>
                ))}
              </div>
            )}
          </Popup>
        </CircleMarker>
      ))}
      {routeComparison && (
        <>
          <Polyline
            positions={routeComparison.baseline_route.path.map((point) => [
              point.lat,
              point.lon,
            ])}
            pathOptions={{
              color: "#bac5d3",
              weight: 3,
              dashArray: "7 8",
              opacity: 0.8,
            }}
          />
          <Polyline
            positions={routeComparison.risk_aware_route.path.map((point) => [
              point.lat,
              point.lon,
            ])}
            pathOptions={{ color: "#59b8ff", weight: 5, opacity: 0.96 }}
          />
        </>
      )}
      {simulatedVehicle && (
        <CircleMarker
          center={[simulatedVehicle.lat, simulatedVehicle.lon]}
          radius={8}
          pathOptions={{
            color: "#d9f2ff",
            weight: 2,
            fillColor: "#57b8f5",
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>TRK-DEMO-01</strong>
            <br />
            Simulated vehicle marker
            <br />
            Medical supplies · {simulatedVehicle.progress}% route progress
          </Popup>
        </CircleMarker>
      )}
      </>}
    </MapContainer>
  );
}
