import { useEffect, useState } from "react";
import {
  Marker,
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
} from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEMO_SHIPMENTS, DEMO_SITUATIONS, REGIONAL_HUBS } from "../data/regionalDemo";
import { isIncidentMarkerVisible } from "../data/movementSimulation";
import { pointAlongRoute } from "../data/regionalRouting";
import districtBoundariesUrl from "../data/ne-district-boundaries.geojson?url";

const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
const cartoTileUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoApiKey ? `?key=${encodeURIComponent(cartoApiKey)}` : ""}`;
const INCIDENT_MARKERS = {
  landslide: { symbol: "▲", label: "Landslide", className: "landslide" },
  flood: { symbol: "≈", label: "Flood", className: "flood" },
  road_damage: { symbol: "⚠", label: "Road damage", className: "road-damage" },
  road_blockage: { symbol: "⊘", label: "Road blockage", className: "road-blockage" },
  other: { symbol: "!", label: "Road incident", className: "other" },
};

function riskColor(risk) {
  if (risk < 0.15) return "#39d4a0";
  if (risk < 0.3) return "#e7bb4b";
  if (risk < 0.45) return "#ec8548";
  return "#f05f69";
}

function bindDistrictInfo(feature, layer) {
  const { district, state } = feature.properties;
  layer.bindTooltip(district, { sticky: true });
  layer.bindPopup(`<strong>${district}</strong><br />${state}`);
}

function incidentIcon(incident) {
  const marker = INCIDENT_MARKERS[incident.type] || INCIDENT_MARKERS.other;
  const status = ["pending", "approved", "rejected"].includes(incident.status) ? incident.status : "pending";
  return divIcon({
    className: `leaflet-div-icon incident-map-icon incident-map-icon-${marker.className} incident-map-icon-${status}`,
    html: `<span aria-hidden="true">${marker.symbol}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function RiskMap({
  riskMapData,
  routeComparison,
  simulatedVehicle,
  regionalMode = false,
  incidents = [],
  movement,
}) {
  const [districtBoundaries, setDistrictBoundaries] = useState(null);
  const [districtBoundaryError, setDistrictBoundaryError] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(districtBoundariesUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load district boundaries (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (active) setDistrictBoundaries(data);
      })
      .catch((error) => {
        if (active) setDistrictBoundaryError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
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
        {districtBoundaries && <GeoJSON
          data={districtBoundaries}
          style={{ color: "#b9d1e4", weight: 1, opacity: 0.75, fillColor: "#69a8d4", fillOpacity: 0.035 }}
          onEachFeature={bindDistrictInfo}
        />}
        {regionalMode ? <>
        {movement?.routes.filter((route) => route.properties.shipment !== "SIM-101").map((route) => (
          <Polyline
            key={route.properties.shipment}
            positions={route.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: "#59b8ff", weight: 2.5, opacity: 0.62 }}
          >
            <Popup><strong>{route.properties.shipment} · Illustrative road route</strong><br />Static OpenStreetMap-based path · not live navigation</Popup>
          </Polyline>
        ))}
        {movement?.routeOptions.map((route) => {
          const selected = route.properties.optionId === movement.selectedRoute?.properties.optionId;
          return <Polyline
            key={route.properties.optionId}
            positions={route.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: selected ? "#59b8ff" : "#b2c5d6",
              weight: selected ? 4 : 2,
              opacity: selected ? 0.95 : 0.55,
              dashArray: selected ? undefined : "6 7",
            }}
          >
            <Popup><strong>{route.properties.label}</strong><br />{(route.properties.distance_m / 1000).toFixed(0)} km · static OSRM road path</Popup>
          </Polyline>;
        })}
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
          const from = REGIONAL_HUBS.find((hub) => hub.id === shipment.from);
          const to = REGIONAL_HUBS.find((hub) => hub.id === shipment.to);
          const vehicle = movement?.vehicleStates.find((item) => item.id === shipment.id);
          const route = vehicle?.route;
          if (!route) return null;
          const position = vehicle.position || pointAlongRoute(route.geometry.coordinates, vehicle.progress);
          if (!position) return null;
          const isStopped = ["waiting_approval", "waiting_clearance", "rerouting"].includes(vehicle.status);
          return <CircleMarker key={shipment.id} center={position} radius={isStopped ? 8 : 6} pathOptions={{
            color: "#d9f2ff",
            weight: 2,
            fillColor: isStopped ? "#f0a34a" : vehicle.status === "returning_to_source" ? "#e16b71" : "#57b8f5",
            fillOpacity: 1,
          }}>
            <Popup><strong>{shipment.id} · Demo shipment</strong><br />{shipment.cargo}<br />{from.city} → {to.city}<br />Status: {vehicle.status.replaceAll("_", " ")} · {Math.round(vehicle.progress * 100)}%<br />{vehicle.route.properties.label}<br />{vehicle.incident ? `Incident #${vehicle.incident.id} · ${vehicle.incident.status}` : "No active report"}<br />Static road path · simulated movement only</Popup>
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
          {incidents.filter((incident) =>
            isIncidentMarkerVisible(incident)
            && Number.isFinite(Number(incident.lat))
            && Number.isFinite(Number(incident.lon))).map((incident) => {
            const marker = INCIDENT_MARKERS[incident.type] || INCIDENT_MARKERS.other;
            return <Marker
              key={`incident-${incident.id}`}
              position={[Number(incident.lat), Number(incident.lon)]}
              icon={incidentIcon(incident)}
              title={`${marker.label} · ${incident.status}`}
              zIndexOffset={1000}
              riseOnHover
            >
              <Popup>
                <strong>{marker.label} · {incident.severity}</strong><br />
                {incident.status === "pending" ? "Reported · awaiting dispatcher approval" : `Status: ${incident.status}`}
                {incident.vehicle_id && <><br />Vehicle: {incident.vehicle_id}{incident.cargo ? ` · ${incident.cargo}` : ""}</>}
                {incident.description && <><br />{incident.description}</>}
                <br />{Number(incident.lat).toFixed(4)}, {Number(incident.lon).toFixed(4)}
              </Popup>
            </Marker>;
          })}
        </MapContainer>
        {districtBoundaryError && <div className="map-layer-error" role="status">District boundaries unavailable: {districtBoundaryError}</div>}
    </>
  );
}
