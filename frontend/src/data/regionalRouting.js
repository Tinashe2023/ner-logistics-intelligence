const EARTH_RADIUS_KM = 6371;
const INCIDENT_BUFFER_KM = 12;

function haversineKm(pointA, pointB) {
  const radians = Math.PI / 180;
  const latA = pointA[1] * radians;
  const latB = pointB[1] * radians;
  const latitudeDelta = (pointB[1] - pointA[1]) * radians;
  const longitudeDelta = (pointB[0] - pointA[0]) * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function segmentProjection(point, start, end) {
  const radians = Math.PI / 180;
  const latitude = point[1] * radians;
  const project = ([lon, lat]) => [lon * radians * Math.cos(latitude), lat * radians];
  const projectedPoint = project(point);
  const projectedStart = project(start);
  const projectedEnd = project(end);
  const dx = projectedEnd[0] - projectedStart[0];
  const dy = projectedEnd[1] - projectedStart[1];
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((projectedPoint[0] - projectedStart[0]) * dx
      + (projectedPoint[1] - projectedStart[1]) * dy) / lengthSquared));
  const projected = [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
  ];
  return { fraction, point: projected, distanceKm: haversineKm(point, projected) };
}

function routeSegmentLengths(coordinates) {
  return coordinates.slice(1).map((point, index) => haversineKm(coordinates[index], point));
}

export function pointAlongRoute(coordinates, progress) {
  if (!coordinates.length) return null;
  if (coordinates.length === 1 || progress <= 0) {
    return [coordinates[0][1], coordinates[0][0]];
  }
  if (progress >= 1) {
    const [lon, lat] = coordinates.at(-1);
    return [lat, lon];
  }

  const lengths = routeSegmentLengths(coordinates);
  const targetDistance = lengths.reduce((total, length) => total + length, 0) * progress;
  let distanceTravelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const segmentLength = lengths[index];
    if (targetDistance <= distanceTravelled + segmentLength) {
      const segmentProgress = segmentLength === 0 ? 0 : (targetDistance - distanceTravelled) / segmentLength;
      const [startLon, startLat] = coordinates[index];
      const [endLon, endLat] = coordinates[index + 1];
      return [
        startLat + (endLat - startLat) * segmentProgress,
        startLon + (endLon - startLon) * segmentProgress,
      ];
    }
    distanceTravelled += segmentLength;
  }
  const [lon, lat] = coordinates.at(-1);
  return [lat, lon];
}

export function nearestRouteProgress(coordinates, position) {
  if (!coordinates.length) return 0;
  const point = [position[1], position[0]];
  const lengths = routeSegmentLengths(coordinates);
  const totalLength = lengths.reduce((total, length) => total + length, 0);
  if (totalLength === 0) return 0;

  let distanceTravelled = 0;
  let nearestDistance = Infinity;
  let nearestProgress = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const projection = segmentProjection(point, coordinates[index], coordinates[index + 1]);
    if (projection.distanceKm < nearestDistance) {
      nearestDistance = projection.distanceKm;
      nearestProgress = (distanceTravelled + lengths[index] * projection.fraction) / totalLength;
    }
    distanceTravelled += lengths[index];
  }
  return nearestProgress;
}

function distanceToRouteKm(point, coordinates) {
  if (coordinates.length === 1) return haversineKm(point, coordinates[0]);
  return Math.min(...coordinates.slice(1).map((segmentEnd, index) =>
    segmentProjection(point, coordinates[index], segmentEnd).distanceKm));
}

function remainingCoordinates(coordinates, progress) {
  if (progress <= 0 || coordinates.length < 2) return coordinates;
  const lengths = routeSegmentLengths(coordinates);
  const targetDistance = lengths.reduce((total, length) => total + length, 0) * progress;
  let distanceTravelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (targetDistance <= distanceTravelled + lengths[index]) {
      const fraction = lengths[index] === 0 ? 0 : (targetDistance - distanceTravelled) / lengths[index];
      const [startLon, startLat] = coordinates[index];
      const [endLon, endLat] = coordinates[index + 1];
      return [
        [startLon + (endLon - startLon) * fraction, startLat + (endLat - startLat) * fraction],
        ...coordinates.slice(index + 1),
      ];
    }
    distanceTravelled += lengths[index];
  }
  return [coordinates.at(-1)];
}

function incidentsOnRoute(route, progress, incidents) {
  const remaining = remainingCoordinates(route.geometry.coordinates, progress);
  return incidents.flatMap((incident) => {
    if (incident.status !== "approved"
      || incident.vehicle_id !== route.properties.shipment
      || incident.clearance_status === "cleared"
      || !Number.isFinite(Number(incident.lat))
      || !Number.isFinite(Number(incident.lon))) return [];
    const distanceKm = distanceToRouteKm([Number(incident.lon), Number(incident.lat)], remaining);
    if (distanceKm > INCIDENT_BUFFER_KM) return [];
    return [{ incident, distanceKm }];
  });
}

function incidentWeight(incident) {
  return { severe: 3, moderate: 2, minor: 1 }[incident.severity] || 1;
}

function routeDuration(route) {
  return Number(route.properties.duration_s) || 0;
}

export function selectRoadRoute(routes, currentOptionId, progress, incidents, shipmentId = "SIM-101") {
  const options = routes.filter((route) => route.properties.shipment === shipmentId);
  if (!options.length) return null;

  const currentRoute = options.find((route) => route.properties.optionId === currentOptionId)
    || options[0];
  const currentPosition = pointAlongRoute(currentRoute.geometry.coordinates, progress);
  const evaluated = options.map((route) => {
    const routeProgress = route === currentRoute
      ? progress
      : nearestRouteProgress(route.geometry.coordinates, currentPosition);
    const hazards = incidentsOnRoute(route, routeProgress, incidents);
    return {
      route,
      progress: routeProgress,
      hazards,
      hazardWeight: hazards.reduce((total, item) => total + incidentWeight(item.incident), 0),
    };
  });
  const current = evaluated.find((option) => option.route === currentRoute);
  if (current.hazards.length === 0) {
    return { ...current, rerouted: false, fullyClear: true, hasAlternatives: options.length > 1 };
  }

  const clearAlternatives = evaluated
    .filter((option) => option.route !== currentRoute && option.hazards.length === 0)
    .sort((a, b) => routeDuration(a.route) - routeDuration(b.route));
  if (clearAlternatives.length) {
    return {
      ...clearAlternatives[0],
      rerouted: true,
      fullyClear: true,
      hasAlternatives: options.length > 1,
      blockedIncidents: current.hazards,
    };
  }

  const leastAffected = evaluated.sort((a, b) =>
    a.hazardWeight - b.hazardWeight
    || a.hazards.length - b.hazards.length
    || routeDuration(a.route) - routeDuration(b.route))[0];
  return {
    ...leastAffected,
    rerouted: leastAffected.route !== currentRoute,
    fullyClear: false,
    hasAlternatives: options.length > 1,
    blockedIncidents: current.hazards,
  };
}

export function closestHubName(position, hubs) {
  if (!position || !hubs.length) return "Location unavailable";
  const nearest = hubs.reduce((best, hub) => {
    const distance = haversineKm([position[1], position[0]], [hub.lon, hub.lat]);
    return distance < best.distance ? { hub, distance } : best;
  }, { hub: hubs[0], distance: Infinity });
  return `Near ${nearest.hub.city}`;
}

export function roadEtaMinutes(route, progress) {
  return Math.max(0, Math.ceil(routeDuration(route) * (1 - progress) / 60));
}
