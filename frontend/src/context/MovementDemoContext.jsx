import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { completeRoadClearance, fetchIncidents } from "../api";
import { REGIONAL_HUBS, DEMO_SHIPMENTS } from "../data/regionalDemo";
import {
  closestHubName,
  pointAlongRoute,
  roadEtaMinutes,
} from "../data/regionalRouting";
import {
  APPROVAL_TIMEOUT_MS,
  advanceVehicle,
  CLEARANCE_DURATION_MS,
  getVehicleIncident,
  incidentTime,
  isRoadClearanceReady,
  SIMULATED_TRIP_DURATION_MS,
} from "../data/movementSimulation";
import baseRoutesUrl from "../data/regional-shipment-routes.geojson?url";
import alternateRoutesUrl from "../data/regional-shipment-alternates.geojson?url";

const MovementDemoContext = createContext(null);

async function loadGeoJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load road routes (${response.status})`);
  return response.json();
}

function prepareRoutes(baseRoutes, alternateRoutes) {
  const primaryRoutes = baseRoutes.features.map((feature) => {
    if (feature.properties.shipment !== "SIM-101") {
      return {
        ...feature,
        properties: { ...feature.properties, optionId: "primary", label: "Primary demo path" },
      };
    }
    return {
      ...feature,
      properties: {
        ...feature.properties,
        optionId: "primary",
        label: "Fastest baseline",
        distance_m: 295331.2,
        duration_s: 13312.9,
      },
    };
  });
  return [...primaryRoutes, ...alternateRoutes.features];
}

function initialTrips(now) {
  return Object.fromEntries(DEMO_SHIPMENTS.map((shipment) => [shipment.id, {
    optionId: "primary",
    progress: shipment.id === "SIM-101" ? 0 : shipment.offset,
    lastTickAt: now,
    status: "in_transit",
    rerouteCount: 0,
    lastRerouteIncidentIds: [],
  }]));
}

export function MovementDemoProvider({ children }) {
  const [routes, setRoutes] = useState([]);
  const [routesError, setRoutesError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentsError, setIncidentsError] = useState(null);
  const [incidentsUpdatedAt, setIncidentsUpdatedAt] = useState(null);
  const [simulationNow, setSimulationNow] = useState(Date.now);
  const [trips, setTrips] = useState(() => initialTrips(Date.now()));
  const completedClearanceRequests = useRef(new Set());

  useEffect(() => {
    let active = true;
    Promise.all([loadGeoJson(baseRoutesUrl), loadGeoJson(alternateRoutesUrl)])
      .then(([baseRoutes, alternateRoutes]) => {
        if (active) setRoutes(prepareRoutes(baseRoutes, alternateRoutes));
      })
      .catch((error) => {
        if (active) setRoutesError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshIncidents = useCallback(async () => {
    try {
      const reports = await fetchIncidents();
      setIncidents(reports);
      setIncidentsError(null);
      setIncidentsUpdatedAt(new Date());
    } catch (error) {
      setIncidentsError(error.message);
    }
  }, []);

  useEffect(() => {
    refreshIncidents();
    const timer = window.setInterval(refreshIncidents, 2000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") refreshIncidents();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [refreshIncidents]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setSimulationNow(now);
      setTrips((previousTrips) => Object.fromEntries(DEMO_SHIPMENTS.map((vehicle) => [
        vehicle.id,
        advanceVehicle(vehicle, previousTrips[vehicle.id], now, incidents, routes),
      ])));
    }, 500);
    return () => window.clearInterval(timer);
  }, [incidents, routes]);

  useEffect(() => {
    for (const incident of incidents) {
      if (incident.status !== "approved"
        || incident.clearance_status !== "team_alerted"
        || completedClearanceRequests.current.has(incident.id)) continue;
      if (!isRoadClearanceReady(incident, simulationNow)) continue;

      completedClearanceRequests.current.add(incident.id);
      completeRoadClearance(incident.id)
        .then(refreshIncidents)
        .catch((error) => {
          setIncidentsError(`Could not complete simulated road clearance: ${error.message}`);
          window.setTimeout(() => completedClearanceRequests.current.delete(incident.id), 3000);
        });
    }
  }, [incidents, refreshIncidents, simulationNow]);

  const vehicleStates = useMemo(() => DEMO_SHIPMENTS.map((shipment) => {
    const trip = trips[shipment.id];
    const route = routes.find((item) =>
      item.properties.shipment === shipment.id && item.properties.optionId === trip.optionId) || null;
    const position = route ? pointAlongRoute(route.geometry.coordinates, trip.progress) : null;
    const incident = getVehicleIncident(incidents, shipment.id);
    const returning = trip.status === "returning_to_source";
    const remainingFraction = returning ? trip.progress : 1 - trip.progress;
    return {
      ...shipment,
      ...trip,
      route,
      position,
      incident,
      currentLocation: closestHubName(position, REGIONAL_HUBS),
      roadEtaMinutes: route
        ? returning
          ? Math.ceil(Number(route.properties.duration_s) * trip.progress / 60)
          : roadEtaMinutes(route, trip.progress)
        : null,
      demoArrivalAt: new Date(simulationNow + remainingFraction * SIMULATED_TRIP_DURATION_MS),
      approvalSecondsRemaining: incident?.status === "pending"
        ? Math.max(0, Math.ceil((incidentTime(incident, "reported_at", simulationNow)
          + APPROVAL_TIMEOUT_MS - simulationNow) / 1000))
        : null,
      clearanceSecondsRemaining: incident?.status === "approved" && incident.clearance_status === "team_alerted"
        ? Math.max(0, Math.ceil((incidentTime(incident, "team_alerted_at", simulationNow)
          + CLEARANCE_DURATION_MS - simulationNow) / 1000))
        : null,
    };
  }), [incidents, routes, simulationNow, trips]);

  const trackedVehicle = vehicleStates.find((vehicle) => vehicle.id === "SIM-101");
  const selectedRoute = trackedVehicle?.route || null;
  const movement = useMemo(() => ({
    routes,
    selectedRoute,
    selectedPosition: trackedVehicle?.position || null,
    progress: trackedVehicle?.progress ?? 0,
    status: trackedVehicle?.status || "in_transit",
    rerouteCount: trackedVehicle?.rerouteCount || 0,
    lastRerouteIncidentIds: trackedVehicle?.lastRerouteIncidentIds || [],
    routeOptions: routes.filter((route) => route.properties.shipment === "SIM-101"),
    vehicleStates,
    roadEtaMinutes: trackedVehicle?.roadEtaMinutes ?? null,
    demoArrivalAt: trackedVehicle?.demoArrivalAt || new Date(simulationNow),
    currentLocation: trackedVehicle?.currentLocation || "Location unavailable",
    hasClearRoute: trackedVehicle?.hasClearRoute ?? true,
    isLoading: !routes.length && !routesError,
    routesError,
    incidentsError,
    incidentsUpdatedAt,
    simulationNow,
  }), [
    incidentsError,
    incidentsUpdatedAt,
    routes,
    routesError,
    selectedRoute,
    simulationNow,
    trackedVehicle,
    vehicleStates,
  ]);

  function restartTrip() {
    setTrips(initialTrips(Date.now()));
  }

  return (
    <MovementDemoContext.Provider value={{ incidents, movement, refreshIncidents, restartTrip }}>
      {children}
    </MovementDemoContext.Provider>
  );
}

export function useMovementDemo() {
  const context = useContext(MovementDemoContext);
  if (!context) throw new Error("useMovementDemo must be used within MovementDemoProvider");
  return context;
}
