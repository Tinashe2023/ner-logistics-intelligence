import { selectRoadRoute } from "./regionalRouting.js";

export const SIMULATED_TRIP_DURATION_MS = 3 * 60 * 1000;
export const APPROVAL_TIMEOUT_MS = 22 * 1000;
export const CLEARANCE_DURATION_MS = 10 * 1000;

export function incidentProgress(incident, fallback) {
  return incident.vehicle_progress != null && Number.isFinite(Number(incident.vehicle_progress))
    ? Number(incident.vehicle_progress)
    : fallback;
}

export function incidentTime(incident, key, fallback) {
  const value = Date.parse(incident[key] || "");
  return Number.isFinite(value) ? value : fallback;
}

export function isRoadClearanceReady(incident, now) {
  return incident.status === "approved"
    && incident.clearance_status === "team_alerted"
    && now - incidentTime(incident, "team_alerted_at", now) >= CLEARANCE_DURATION_MS;
}

export function isIncidentMarkerVisible(incident) {
  return incident.status === "pending"
    || (incident.status === "approved" && incident.clearance_status !== "cleared");
}

export function getVehicleIncident(incidents, vehicleId) {
  const latestIncident = incidents
    .filter((incident) => incident.vehicle_id === vehicleId)
    .sort((left, right) =>
      incidentTime(right, "reported_at", 0) - incidentTime(left, "reported_at", 0))[0];
  if (latestIncident?.status === "pending"
    || (latestIncident?.status === "approved" && latestIncident.clearance_status !== "cleared")) {
    return latestIncident;
  }
  return null;
}

export function advanceVehicle(vehicle, previous, now, incidents, routes) {
  const elapsed = Math.max(0, now - previous.lastTickAt);
  const activeIncident = getVehicleIncident(incidents, vehicle.id);

  if (previous.status === "arrived") {
    return { ...previous, lastTickAt: now };
  }

  if (activeIncident?.status === "approved" && activeIncident.clearance_status === "team_alerted") {
    return {
      ...previous,
      lastTickAt: now,
      status: "waiting_clearance",
      activeIncidentId: activeIncident.id,
      hasClearRoute: false,
    };
  }

  if (previous.status === "returned_to_source" && previous.rerouteTargetOptionId) {
    return {
      ...previous,
      optionId: previous.rerouteTargetOptionId,
      rerouteTargetOptionId: undefined,
      lastTickAt: now,
      status: "rerouting",
      rerouteCount: previous.rerouteCount + 1,
      lastRerouteIncidentIds: previous.pendingRerouteIncidentIds || [],
      pendingRerouteIncidentIds: undefined,
    };
  }

  if (previous.status === "returned_to_source" && !activeIncident) {
    return { ...previous, lastTickAt: now };
  }

  if (previous.status === "returning_to_source") {
    const progress = Math.max(0, previous.progress - elapsed / SIMULATED_TRIP_DURATION_MS);
    return {
      ...previous,
      progress,
      lastTickAt: now,
      status: progress === 0 ? "returned_to_source" : "returning_to_source",
    };
  }

  if (activeIncident?.status === "pending") {
    const progress = incidentProgress(activeIncident, previous.progress);
    const deadline = incidentTime(activeIncident, "reported_at", now) + APPROVAL_TIMEOUT_MS;
    if (now < deadline) {
      return {
        ...previous,
        progress,
        lastTickAt: now,
        status: "waiting_approval",
        activeIncidentId: activeIncident.id,
        hasClearRoute: previous.hasClearRoute ?? true,
      };
    }
    const returningProgress = Math.max(0, previous.progress - elapsed / SIMULATED_TRIP_DURATION_MS);
    return {
      ...previous,
      progress: returningProgress,
      lastTickAt: now,
      status: returningProgress === 0 ? "returned_to_source" : "returning_to_source",
      activeIncidentId: activeIncident.id,
      hasClearRoute: previous.hasClearRoute ?? true,
    };
  }

  const handledIncidentIds = previous.handledIncidentIds || [];
  const approvedIncidents = activeIncident?.status === "approved"
    && activeIncident.clearance_status !== "cleared"
    && !handledIncidentIds.includes(activeIncident.id)
    ? [activeIncident]
    : [];

  const currentRoute = routes.find((route) =>
    route.properties.shipment === vehicle.id
    && route.properties.optionId === previous.optionId);
  const decision = currentRoute
    ? selectRoadRoute(routes, previous.optionId, previous.progress, approvedIncidents, vehicle.id)
    : null;

  if (decision && !decision.fullyClear && !decision.hasAlternatives) {
    return {
      ...previous,
      progress: decision.progress,
      lastTickAt: now,
      status: "waiting_clearance",
      activeIncidentId: activeIncident?.id,
      hasClearRoute: false,
    };
  }

  const optionChanged = decision?.rerouted
    && decision.route.properties.optionId !== previous.optionId;
  if (optionChanged && previous.progress > 0) {
    const rerouteIncidentIds = decision.blockedIncidents.map(({ incident }) => incident.id);
    return {
      ...previous,
      lastTickAt: now,
      status: "returning_to_source",
      activeIncidentId: rerouteIncidentIds[0],
      rerouteTargetOptionId: decision.route.properties.optionId,
      pendingRerouteIncidentIds: rerouteIncidentIds,
      handledIncidentIds: [...new Set([...handledIncidentIds, ...rerouteIncidentIds])],
      hasClearRoute: decision.fullyClear,
    };
  }

  const optionId = optionChanged ? decision.route.properties.optionId : previous.optionId;
  const progress = optionChanged
    ? 0
    : previous.progress + elapsed / SIMULATED_TRIP_DURATION_MS;
  const arrived = progress >= 1;
  return {
    ...previous,
    optionId,
    progress: Math.min(1, progress),
    lastTickAt: now,
    status: arrived ? "arrived" : optionChanged ? "rerouting" : "in_transit",
    activeIncidentId: undefined,
    hasClearRoute: decision?.fullyClear ?? true,
    rerouteCount: previous.rerouteCount + (optionChanged ? 1 : 0),
    lastRerouteIncidentIds: optionChanged
      ? decision.blockedIncidents.map(({ incident }) => incident.id)
      : previous.lastRerouteIncidentIds,
    handledIncidentIds: optionChanged
      ? [...new Set([...handledIncidentIds, ...decision.blockedIncidents.map(({ incident }) => incident.id)])]
      : handledIncidentIds,
  };
}
