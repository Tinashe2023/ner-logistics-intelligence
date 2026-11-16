import { Link } from "react-router-dom";
import RiskMap from "../components/RiskMap";
import { DEMO_SHIPMENTS } from "../data/regionalDemo";
import { useMovementDemo } from "../context/MovementDemoContext";
import "../styles/dashboard.css";

const FEATURED_SHIPMENT = DEMO_SHIPMENTS.find((shipment) => shipment.id === "SIM-101");

export default function MovementVisibility() {
  const { incidents, movement, restartTrip } = useMovementDemo();
  const featuredVehicle = movement.vehicleStates.find((vehicle) => vehicle.id === "SIM-101");
  const routeLabel = movement.selectedRoute?.properties.label || "Loading route";
  const affectedReports = movement.lastRerouteIncidentIds
    .map((id) => incidents.find((incident) => incident.id === id))
    .filter(Boolean);

  return (
    <main className="movement-page">
      <header className="movement-page-heading">
        <div>
          <div className="eyebrow">MOVEMENT VISIBILITY · CLASS DEMO</div>
          <h1>Shipment movement</h1>
          <p>Six simulated shipments on precomputed regional routes. No live GPS or traffic feed.</p>
        </div>
        <div className="movement-page-actions">
          <Link className="header-link" to="/command">Command center</Link>
          <button type="button" className="text-button movement-restart" onClick={restartTrip}>Restart demo trip</button>
        </div>
      </header>

      {movement.routesError && <div className="error-banner" role="alert">{movement.routesError}</div>}
      {movement.incidentsError && <div className="error-banner" role="alert">Incident updates unavailable: {movement.incidentsError}</div>}

      <section className="movement-summary-grid" aria-label="Shipment status">
        <article className="panel movement-summary-card">
          <span>VEHICLE STATUS</span>
          <strong className={movement.status === "arrived" ? "movement-arrived" : ""}>
            {movement.isLoading ? "Loading" : vehicleStatusText(movement.status)}
          </strong>
          <small>{FEATURED_SHIPMENT.id} · medical supplies demo</small>
        </article>
        <article className="panel movement-summary-card">
          <span>CURRENT LOCATION</span>
          <strong>{movement.currentLocation}</strong>
          <small>{movement.selectedPosition ? `${movement.selectedPosition[0].toFixed(3)}, ${movement.selectedPosition[1].toFixed(3)}` : "Waiting for route data"}</small>
        </article>
        <article className="panel movement-summary-card">
          <span>DEMO ARRIVAL</span>
          <strong>{movement.status === "arrived" ? "Trip complete" : movement.demoArrivalAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
          <small>Accelerated simulation time · not an operational ETA</small>
        </article>
        <article className="panel movement-summary-card">
          <span>ROAD ROUTE ESTIMATE</span>
          <strong>{movement.roadEtaMinutes == null ? "—" : formatDuration(movement.roadEtaMinutes)}</strong>
          <small>Static route estimate · no live traffic</small>
        </article>
      </section>

      <section className="movement-layout">
        <article className="panel map-panel movement-map-panel">
          <div className="panel-heading map-heading">
            <div><div className="eyebrow">ROAD-BASED SIMULATION</div><h2>Guwahati → Itanagar</h2></div>
            <span className={`movement-status-pill ${movement.status === "arrived" ? "is-arrived" : ""}`}>{vehicleStatusText(movement.status)}</span>
          </div>
          <div className="map-frame movement-map-frame">
            {!movement.isLoading && <RiskMap
              riskMapData={null}
              routeComparison={null}
              simulatedVehicle={null}
              regionalMode
              simulationClock={movement.simulationNow}
              incidents={incidents}
              movement={movement}
            />}
            <div className="map-caption"><span className="legend-line legend-risk" /> SIM-101 route <span className="legend-line legend-base" /> Alternatives <span className="incident-legend">!</span> Reported incident <span className="vehicle-legend" /> Demo vehicles</div>
          </div>
          <div className="movement-progress-row">
            <span>Trip progress</span>
            <div className="movement-progress-track"><span style={{ width: `${Math.round(movement.progress * 100)}%` }} /></div>
            <strong>{Math.round(movement.progress * 100)}%</strong>
          </div>
          <div className="map-footer">
            <span>{routeLabel}{movement.rerouteCount ? ` · ${movement.rerouteCount} reroute${movement.rerouteCount === 1 ? "" : "s"}` : ""}</span>
            <span>Static OSRM / OpenStreetMap paths · pending reports do not trigger reroutes</span>
          </div>
        </article>

        <aside className="panel movement-details-panel">
          <div className="panel-heading"><div><div className="eyebrow">DISPATCH SUMMARY</div><h2>Route decisions</h2></div><span className="panel-icon">⌁</span></div>
          <div className="movement-route-list">
            {movement.routeOptions.map((route) => {
              const isSelected = route.properties.optionId === movement.selectedRoute?.properties.optionId;
              return <div className={`movement-route-option ${isSelected ? "is-selected" : ""}`} key={route.properties.optionId}>
                <span className="movement-route-dot" />
                <div><strong>{route.properties.label}</strong><small>{(route.properties.distance_m / 1000).toFixed(0)} km · {formatDuration(Math.ceil(route.properties.duration_s / 60))}</small></div>
                <span>{isSelected ? movement.status === "arrived" ? "ARRIVED" : "ACTIVE" : "ALTERNATE"}</span>
              </div>;
            })}
          </div>
          {movement.rerouteCount > 0 && <div className={`movement-reroute-note ${movement.hasClearRoute ? "" : "has-no-clear-route"}`}>
            <strong>{movement.hasClearRoute ? "Route recalculated after dispatcher approval" : "No clear alternate in this demo"}</strong>
            {affectedReports.length > 0
              ? <span>{affectedReports.map((report) => `${report.type.replace("_", " ")} #${report.id}`).join(", ")}</span>
              : <span>Approved reports near the previous route.</span>}
          </div>}
          {movement.rerouteCount === 0 && !movement.hasClearRoute && <div className="movement-reroute-note has-no-clear-route">
            <strong>No clear alternate in this demo</strong>
            <span>Approved reports affect the available paths, but no option is free of nearby reports.</span>
          </div>}
          {featuredVehicle?.status === "waiting_approval" && <p className="panel-hint">SIM-101 is stopped for dispatcher review · returns to Guwahati if no decision arrives in {featuredVehicle.approvalSecondsRemaining}s.</p>}
          {featuredVehicle?.status === "waiting_clearance" && <p className="panel-hint">SIM-101 is stopped until dispatch alerts the road team. Open the dispatcher panel and use “Alert road team” on the approved report.</p>}
          {movement.rerouteCount === 0 && movement.hasClearRoute && !["waiting_approval", "waiting_clearance"].includes(featuredVehicle?.status) && <p className="panel-hint">Reports pause only the selected vehicle. A pending report returns that vehicle to its source after 22 seconds without a dispatcher decision.</p>}
          <div className="movement-dispatch-links">
            <Link to="/driver">Submit a field report <span>→</span></Link>
            <Link to="/command">Review the command center <span>→</span></Link>
          </div>
        </aside>
      </section>
      <section className="movement-fleet-grid" aria-label="Simulated vehicle status">
        {movement.vehicleStates.map((vehicle) => <article className="panel movement-fleet-card" key={vehicle.id}>
          <span>{vehicle.id} · {vehicle.cargo}</span>
          <strong>{vehicleStatusText(vehicle.status)}</strong>
          <small>{vehicle.currentLocation} · {Math.round(vehicle.progress * 100)}%</small>
          {vehicle.approvalSecondsRemaining != null && <small>Dispatcher decision in {vehicle.approvalSecondsRemaining}s or returning to source</small>}
          {vehicle.clearanceSecondsRemaining != null && <small>Simulated road clearance in {vehicle.clearanceSecondsRemaining}s</small>}
          {vehicle.status === "waiting_clearance" && vehicle.clearanceSecondsRemaining == null && <small>Awaiting dispatcher action: approve and alert the road team.</small>}
        </article>)}
      </section>
      <footer className="command-footer"><span>NER Logistics Intelligence · SIH 26002 class prototype</span><span>Simulation only · verify conditions with local authorities</span></footer>
    </main>
  );
}

function vehicleStatusText(status) {
  return {
    in_transit: "In transit",
    rerouting: "Route selected · restarting at source",
    arrived: "Arrived",
    waiting_approval: "Stopped · awaiting approval",
    waiting_clearance: "Stopped · awaiting road clearance",
    returning_to_source: "Returning to source",
    returned_to_source: "Returned to source",
  }[status] || status;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}
