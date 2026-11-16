import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nearestRouteProgress, pointAlongRoute, selectRoadRoute } from "./regionalRouting.js";
import {
  advanceVehicle,
  APPROVAL_TIMEOUT_MS,
  getVehicleIncident,
  isIncidentMarkerVisible,
  isRoadClearanceReady,
} from "./movementSimulation.js";

function route(optionId, coordinates, duration) {
  return {
    properties: {
      shipment: "SIM-101",
      optionId,
      duration_s: duration,
    },
    geometry: {
      coordinates,
    },
  };
}

test("pending reports do not trigger a route change", () => {
  const routes = [
    route("primary", [[0, 0], [1, 0]], 100),
    route("alternate", [[0, 0], [1, 1]], 150),
  ];
  const decision = selectRoadRoute(routes, "primary", 0.1, [
    { id: 1, vehicle_id: "SIM-101", lat: 0, lon: 0.5, severity: "severe", status: "pending" },
  ]);
  assert.equal(decision.route.properties.optionId, "primary");
  assert.equal(decision.rerouted, false);
});

test("an approved incident selects the fastest clear alternate", () => {
  const routes = [
    route("primary", [[0, 0], [1, 0]], 100),
    route("alternate-east", [[0, 0], [1, 1]], 160),
    route("alternate-south", [[0, 0], [0, 1], [1, 1]], 200),
  ];
  const decision = selectRoadRoute(routes, "primary", 0.1, [
    { id: 2, vehicle_id: "SIM-101", lat: 0, lon: 0.5, severity: "moderate", status: "approved" },
  ]);
  assert.equal(decision.route.properties.optionId, "alternate-east");
  assert.equal(decision.rerouted, true);
  assert.equal(decision.fullyClear, true);
  assert.deepEqual(decision.blockedIncidents.map(({ incident }) => incident.id), [2]);
});

test("when every option is affected, select the route with the least severe reports", () => {
  const routes = [
    route("primary", [[0, 0], [1, 0]], 100),
    route("alternate-east", [[0, 0.2], [1, 0.2]], 150),
    route("alternate-south", [[0, 0.4], [1, 0.4]], 200),
  ];
  const decision = selectRoadRoute(routes, "primary", 0, [
    { id: 3, vehicle_id: "SIM-101", lat: 0, lon: 0.5, severity: "severe", status: "approved" },
    { id: 4, vehicle_id: "SIM-101", lat: 0.2, lon: 0.5, severity: "moderate", status: "approved" },
    { id: 5, vehicle_id: "SIM-101", lat: 0.4, lon: 0.5, severity: "minor", status: "approved" },
  ]);
  assert.equal(decision.route.properties.optionId, "alternate-south");
  assert.equal(decision.fullyClear, false);
});

test("reports for other vehicles and cleared roads do not block this route", () => {
  const routes = [
    route("primary", [[0, 0], [1, 0]], 100),
    route("alternate", [[0, 0], [1, 1]], 150),
  ];
  const decision = selectRoadRoute(routes, "primary", 0, [
    { id: 6, vehicle_id: "SIM-204", lat: 0, lon: 0.5, severity: "severe", status: "approved" },
    { id: 7, vehicle_id: "SIM-101", lat: 0, lon: 0.5, severity: "severe", status: "approved", clearance_status: "cleared" },
  ]);
  assert.equal(decision.route.properties.optionId, "primary");
  assert.equal(decision.rerouted, false);
  assert.equal(decision.fullyClear, true);
});

test("a vehicle with no alternate remains on its only route and signals no alternate", () => {
  const onlyRoute = {
    ...route("primary", [[0, 0], [1, 0]], 100),
    properties: { ...route("primary", [[0, 0], [1, 0]], 100).properties, shipment: "SIM-204" },
  };
  const decision = selectRoadRoute([onlyRoute], "primary", 0, [
    { id: 8, vehicle_id: "SIM-204", lat: 0, lon: 0.5, severity: "severe", status: "approved" },
  ], "SIM-204");
  assert.equal(decision.hasAlternatives, false);
  assert.equal(decision.fullyClear, false);
  assert.equal(decision.rerouted, false);
});

test("a pending vehicle report pauses movement and sends the vehicle back after 22 seconds", () => {
  const vehicle = { id: "SIM-101" };
  const routes = [route("primary", [[0, 0], [1, 0]], 100)];
  const report = {
    id: 9,
    vehicle_id: "SIM-101",
    vehicle_progress: 0.4,
    reported_at: new Date(0).toISOString(),
    status: "pending",
  };
  const stopped = advanceVehicle(vehicle, {
    optionId: "primary",
    progress: 0.6,
    lastTickAt: APPROVAL_TIMEOUT_MS - 1000,
    status: "in_transit",
  }, APPROVAL_TIMEOUT_MS - 1, [report], routes);
  assert.equal(stopped.status, "waiting_approval");
  assert.equal(stopped.progress, 0.4);

  const returning = advanceVehicle(vehicle, stopped, APPROVAL_TIMEOUT_MS + 999, [report], routes);
  assert.equal(returning.status, "returning_to_source");
  assert.ok(returning.progress < 0.4);
});

test("the newest vehicle report takes precedence over older unresolved database records", () => {
  const olderPending = {
    id: 20,
    vehicle_id: "SIM-101",
    status: "pending",
    reported_at: new Date(1000).toISOString(),
  };
  const latestApproved = {
    id: 21,
    vehicle_id: "SIM-101",
    status: "approved",
    clearance_status: "not_requested",
    reported_at: new Date(2000).toISOString(),
  };
  assert.equal(getVehicleIncident([olderPending, latestApproved], "SIM-101").id, 21);
  assert.equal(getVehicleIncident([
    { ...olderPending, status: "approved" },
    { ...latestApproved, status: "rejected" },
  ], "SIM-101"), null);
});

test("an approved reroute returns to source, changes route there, then resumes from zero", () => {
  const primary = route("primary", [[0, 0], [1, 0]], 100);
  const alternate = route("alternate", [[0, 0], [1, 1]], 150);
  const vehicle = { id: "SIM-101" };
  const incident = { id: 10, vehicle_id: "SIM-101", lat: 0, lon: 0.5, status: "approved", severity: "severe" };
  const returning = advanceVehicle(
    vehicle,
    { optionId: "primary", progress: 0.4, lastTickAt: 0, status: "waiting_approval", rerouteCount: 0 },
    1000,
    [incident],
    [primary, alternate],
  );
  assert.equal(returning.optionId, "primary");
  assert.equal(returning.status, "returning_to_source");
  assert.equal(returning.progress, 0.4);

  const atSource = advanceVehicle(
    vehicle,
    returning,
    1000 + 180 * 1000,
    [incident],
    [primary, alternate],
  );
  assert.equal(atSource.status, "returned_to_source");
  assert.equal(atSource.progress, 0);

  const rerouted = advanceVehicle(
    vehicle,
    atSource,
    1000 + 180 * 1000 + 500,
    [incident],
    [primary, alternate],
  );
  assert.equal(rerouted.optionId, "alternate");
  assert.equal(rerouted.status, "rerouting");
  assert.equal(rerouted.progress, 0);
  assert.equal(rerouted.rerouteCount, 1);
  assert.deepEqual(rerouted.handledIncidentIds, [10]);

  const resumed = advanceVehicle(
    vehicle,
    rerouted,
    1000 + 180 * 1000 + 1000,
    [incident],
    [primary, alternate],
  );
  assert.equal(resumed.status, "in_transit");
  assert.ok(resumed.progress > 0);

  const continues = advanceVehicle(
    vehicle,
    resumed,
    1000 + 180 * 1000 + 1500,
    [incident],
    [primary, alternate],
  );
  assert.equal(continues.status, "in_transit");
  assert.equal(continues.optionId, "alternate");
  assert.ok(continues.progress > resumed.progress);
});

test("approve and alert holds the current route through clearance without rerouting", () => {
  const primary = route("primary", [[0, 0], [1, 0]], 100);
  const alternate = route("alternate", [[0, 0], [1, 1]], 150);
  const vehicle = { id: "SIM-101" };
  const alerted = {
    id: 13,
    vehicle_id: "SIM-101",
    lat: 0,
    lon: 0.5,
    status: "approved",
    severity: "severe",
    clearance_status: "team_alerted",
  };
  const stopped = advanceVehicle(
    vehicle,
    { optionId: "primary", progress: 0.4, lastTickAt: 0, status: "waiting_approval", rerouteCount: 0 },
    1000,
    [alerted],
    [primary, alternate],
  );
  assert.equal(stopped.status, "waiting_clearance");
  assert.equal(stopped.optionId, "primary");
  assert.equal(stopped.progress, 0.4);

  const moving = advanceVehicle(
    vehicle,
    stopped,
    2000,
    [{ ...alerted, clearance_status: "cleared" }],
    [primary, alternate],
  );
  assert.equal(moving.status, "in_transit");
  assert.equal(moving.optionId, "primary");
  assert.ok(moving.progress > stopped.progress);
  assert.equal(moving.rerouteCount, 0);
});

test("a vehicle with no alternate waits for road clearance", () => {
  const primary = route("primary", [[0, 0], [1, 0]], 100);
  const blocked = advanceVehicle(
    { id: "SIM-204" },
    { optionId: "primary", progress: 0.4, lastTickAt: 0, status: "waiting_approval" },
    1000,
    [{ id: 11, vehicle_id: "SIM-204", lat: 0, lon: 0.5, status: "approved", severity: "severe" }],
    [{
      ...primary,
      properties: { ...primary.properties, shipment: "SIM-204" },
    }],
  );
  assert.equal(blocked.status, "waiting_clearance");
  assert.equal(blocked.progress, 0.4);
});

test("road-team clearance holds the vehicle, then lets it continue after the road is marked clear", () => {
  const routeForVehicle = {
    ...route("primary", [[0, 0], [1, 0]], 100),
    properties: { ...route("primary", [[0, 0], [1, 0]], 100).properties, shipment: "SIM-204" },
  };
  const alerted = {
    id: 12,
    vehicle_id: "SIM-204",
    lat: 0,
    lon: 0.5,
    status: "approved",
    severity: "severe",
    clearance_status: "team_alerted",
  };
  const stopped = advanceVehicle(
    { id: "SIM-204" },
    { optionId: "primary", progress: 0.4, lastTickAt: 0, status: "waiting_clearance" },
    5000,
    [alerted],
    [routeForVehicle],
  );
  assert.equal(stopped.status, "waiting_clearance");
  assert.equal(stopped.progress, 0.4);

  const moving = advanceVehicle(
    { id: "SIM-204" },
    stopped,
    6000,
    [{ ...alerted, clearance_status: "cleared" }],
    [routeForVehicle],
  );
  assert.equal(moving.status, "in_transit");
  assert.ok(moving.progress > stopped.progress);
});

test("the road team is marked ready exactly 10 seconds after the alert", () => {
  const incident = {
    status: "approved",
    clearance_status: "team_alerted",
    team_alerted_at: new Date(5000).toISOString(),
  };
  assert.equal(isRoadClearanceReady(incident, 14999), false);
  assert.equal(isRoadClearanceReady(incident, 15000), true);
});

test("incident map markers show pending and uncleared approved reports only", () => {
  assert.equal(isIncidentMarkerVisible({ status: "pending" }), true);
  assert.equal(isIncidentMarkerVisible({
    status: "approved",
    clearance_status: "not_requested",
  }), true);
  assert.equal(isIncidentMarkerVisible({
    status: "approved",
    clearance_status: "team_alerted",
  }), true);
  assert.equal(isIncidentMarkerVisible({
    status: "approved",
    clearance_status: "cleared",
  }), false);
  assert.equal(isIncidentMarkerVisible({ status: "rejected" }), false);
});

test("route progress helpers return positions in Leaflet latitude-longitude order", () => {
  const coordinates = [[0, 0], [1, 0]];
  assert.deepEqual(pointAlongRoute(coordinates, 0.5), [0, 0.5]);
  assert.ok(Math.abs(nearestRouteProgress(coordinates, [0, 0.75]) - 0.75) < 0.001);
});

test("the featured shipment has a primary path and two alternate road paths", () => {
  const base = JSON.parse(readFileSync(new URL("./regional-shipment-routes.geojson", import.meta.url), "utf8"));
  const alternates = JSON.parse(readFileSync(new URL("./regional-shipment-alternates.geojson", import.meta.url), "utf8"));
  const options = [
    ...base.features.filter((feature) => feature.properties.shipment === "SIM-101"),
    ...alternates.features,
  ];
  assert.equal(options.length, 3);
  assert.deepEqual(
    new Set(options.map((option) => option.properties.optionId || "primary")),
    new Set(["primary", "alternate-east", "alternate-south"]),
  );
  for (const option of options) {
    const coordinates = option.geometry.coordinates;
    assert.ok(coordinates.length > 10);
    assert.ok(Math.abs(coordinates[0][0] - 91.7362) < 0.01);
    assert.ok(Math.abs(coordinates.at(-1)[0] - 93.6053) < 0.01);
  }
});

test("all six simulated shipments have a regional path", () => {
  const base = JSON.parse(readFileSync(new URL("./regional-shipment-routes.geojson", import.meta.url), "utf8"));
  assert.deepEqual(
    new Set(base.features.map((feature) => feature.properties.shipment)),
    new Set(["SIM-101", "SIM-204", "SIM-318", "SIM-427", "SIM-536", "SIM-642"]),
  );
});
