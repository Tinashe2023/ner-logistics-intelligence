"""
Loads the risk-weighted corridor graph once (cached at module level).

Reads node coordinates from corridor_nodes.json (a plain, lightweight
file) rather than parsing the .graphml via osmnx — this means the
DEPLOYED backend never needs osmnx/geopandas/rasterio/GDAL, only
networkx + plain JSON. Those heavier packages stay as local-only
data-prep tools (see backend/scripts/), regenerating corridor_nodes.json
whenever the underlying graph changes.
"""
import json
import math
import os

from app.routing.risk_aware_router import build_graph_from_edges

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
NODES_PATH = os.path.join(DATA_DIR, "corridor_nodes.json")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")

_graph = None
_coords = None
_edges_raw = None


def _load():
    global _graph, _coords, _edges_raw
    if _graph is not None:
        return

    with open(EDGES_PATH) as f:
        edges = json.load(f)
    _edges_raw = edges
    _graph = build_graph_from_edges(edges)

    with open(NODES_PATH) as f:
        raw_coords = json.load(f)
    _coords = {node_id: tuple(latlon) for node_id, latlon in raw_coords.items()}

    # Rebuild the prototype risk overlay from approved incidents whenever the
    # baseline graph is loaded. The database is the source of truth; the graph
    # is a cache derived from baseline edges plus reviewed incident records.
    from app.db.database import SessionLocal
    from app.models.incident import Incident

    db = SessionLocal()
    try:
        approved = (
            db.query(Incident)
            .filter(Incident.status == "approved")
            .order_by(Incident.id.asc())
            .all()
        )
        for incident in approved:
            _apply_risk_bump(incident.lat, incident.lon, 15.0, 0.4)
    finally:
        db.close()


def get_graph():
    _load()
    return _graph


def get_coords():
    _load()
    return _coords


def get_edges_raw():
    _load()
    return _edges_raw


def nearest_node(lat: float, lon: float) -> str:
    """Brute-force nearest node — fine at ~9k nodes (well under 50ms)."""
    coords = get_coords()
    best_node, best_dist = None, math.inf
    for node, (nlat, nlon) in coords.items():
        d = (nlat - lat) ** 2 + (nlon - lon) ** 2
        if d < best_dist:
            best_dist = d
            best_node = node
    return best_node


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bump_risk_near(lat: float, lon: float, radius_km: float = 15.0, amount: float = 0.4) -> int:
    """
    Raises risk_score (capped at 1.0) on every edge within radius_km of an
    approved incident, in both the cached graph (used for routing) and the
    raw edges list (used for the risk-map API). The overlay is cached in
    memory and replayed from approved database records when the graph loads.

    Returns the number of edges affected.
    """
    _load()
    return _apply_risk_bump(lat, lon, radius_km, amount)


def _apply_risk_bump(lat: float, lon: float, radius_km: float, amount: float) -> int:
    """Apply one approved-incident overlay to the loaded graph."""
    graph = _graph
    edges_raw = _edges_raw
    coords = _coords

    affected = 0
    for e in edges_raw:
        u, v = e["u"], e["v"]
        if u not in coords or v not in coords:
            continue
        mid_lat = (coords[u][0] + coords[v][0]) / 2
        mid_lon = (coords[u][1] + coords[v][1]) / 2
        if _haversine_km(lat, lon, mid_lat, mid_lon) <= radius_km:
            new_risk = min(e.get("risk_score", 0.0) + amount, 1.0)
            e["risk_score"] = new_risk
            if graph.has_edge(u, v):
                from app.routing.risk_aware_router import edge_cost
                graph[u][v]["risk_score"] = new_risk
                graph[u][v]["weight"] = edge_cost(
                    graph[u][v].get("travel_time_min", 0),
                    graph[u][v].get("distance_km", 0),
                    new_risk,
                )
            affected += 1
    return affected
