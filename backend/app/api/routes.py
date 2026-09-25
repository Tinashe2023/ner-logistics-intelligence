"""
API routes for the core intelligence loop, now including the incident
workflow (Phase 5):

  field report (pending) -> dispatcher approves -> risk bumped on nearby
  edges -> next /route or /network/risk-map call reflects it

The PHP admin panel (Week 3) reads/writes the same `incidents` table via
PDO, using GET /api/incidents to see what's pending and POST
/api/incidents/{id}/approve|reject to act on it — or the PHP panel can
call approve/reject directly through this API instead of writing to the
DB itself, whichever ends up cleaner once that panel exists.
"""
import networkx as nx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.graph_loader import bump_risk_near, get_coords, get_edges_raw, get_graph, nearest_node
from app.models.incident import Incident
from app.routing.risk_aware_router import shortest_risk_aware_path

router = APIRouter()

LOCATIONS = {
    "guwahati": (26.1445, 91.7362),
    "tawang": (27.5859, 91.8594),
    "tezpur": (26.6528, 92.7926),
    "bomdila": (27.2649, 92.4021),
    "dirang": (27.3557, 92.2373),
}

RISK_BUMP_RADIUS_KM = 5.0
RISK_BUMP_AMOUNT = 0.3


class RouteRequest(BaseModel):
    origin: str
    destination: str


class IncidentCreate(BaseModel):
    lat: float
    lon: float
    type: str
    severity: str
    description: str | None = None


def _resolve_location(name: str) -> str:
    key = name.strip().lower()
    if key not in LOCATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown location '{name}'. Available: {', '.join(LOCATIONS.keys())}",
        )
    lat, lon = LOCATIONS[key]
    return nearest_node(lat, lon)


def _path_to_coords(path, coords):
    return [{"lat": coords[n][0], "lon": coords[n][1]} for n in path]


def _path_stats(G, path):
    total_distance = total_time = total_risk = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edge = G.get_edge_data(u, v)
        if edge is None:
            continue
        total_distance += edge.get("distance_km", 0.0)
        total_time += edge.get("travel_time_min", 0.0)
        total_risk += edge.get("risk_score", 0.0)
    return {
        "distance_km": round(total_distance, 2),
        "travel_time_min": round(total_time, 1),
        "total_risk_exposure": round(total_risk, 3),
        "num_segments": len(path) - 1,
    }


@router.get("/network/risk-map")
def get_risk_map():
    G = get_graph()
    coords = get_coords()
    edges_raw = get_edges_raw()

    orig = _resolve_location("guwahati")
    dest = _resolve_location("tawang")
    spine_path = nx.dijkstra_path(G, orig, dest, weight="distance_km")

    spine = []
    for u, v in zip(spine_path[:-1], spine_path[1:]):
        edge = G.get_edge_data(u, v)
        if edge is None:
            continue
        spine.append({
            "u_lat": coords[u][0], "u_lon": coords[u][1],
            "v_lat": coords[v][0], "v_lon": coords[v][1],
            "risk_score": edge.get("risk_score", 0.0),
            "osm_name": edge.get("osm_name", "unnamed"),
        })

    hotspots_raw = sorted(edges_raw, key=lambda e: e.get("risk_score", 0), reverse=True)[:20]
    hotspots = []
    for e in hotspots_raw:
        u, v = e["u"], e["v"]
        if u not in coords or v not in coords:
            continue
        mid_lat = (coords[u][0] + coords[v][0]) / 2
        mid_lon = (coords[u][1] + coords[v][1]) / 2
        hotspots.append({
            "lat": mid_lat, "lon": mid_lon,
            "risk_score": e.get("risk_score", 0.0),
            "osm_name": e.get("osm_name", "unnamed"),
        })

    return {"spine": spine, "hotspots": hotspots}


@router.post("/route")
def get_route(req: RouteRequest):
    G = get_graph()
    coords = get_coords()

    orig = _resolve_location(req.origin)
    dest = _resolve_location(req.destination)

    if not nx.has_path(G, orig, dest):
        raise HTTPException(status_code=404, detail="No path found between these locations in the current graph.")

    risk_aware_path, _ = shortest_risk_aware_path(G, orig, dest)
    baseline_path = nx.dijkstra_path(G, orig, dest, weight="distance_km")

    return {
        "origin": req.origin,
        "destination": req.destination,
        "risk_aware_route": {
            "path": _path_to_coords(risk_aware_path, coords),
            "stats": _path_stats(G, risk_aware_path),
        },
        "baseline_route": {
            "path": _path_to_coords(baseline_path, coords),
            "stats": _path_stats(G, baseline_path),
        },
    }


@router.post("/incidents")
def report_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    """Field/driver report — saved as 'pending', does not yet affect routing."""
    row = Incident(
        lat=incident.lat, lon=incident.lon, type=incident.type,
        severity=incident.severity, description=incident.description,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"status": "received", "incident_id": row.id}


@router.get("/incidents")
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    """Used by the PHP admin panel to show pending/approved/rejected reports."""
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    rows = query.order_by(Incident.reported_at.desc()).all()
    return [
        {
            "id": r.id, "lat": r.lat, "lon": r.lon, "type": r.type,
            "severity": r.severity, "description": r.description,
            "status": r.status, "reported_at": r.reported_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/incidents/{incident_id}/approve")
def approve_incident(incident_id: int, db: Session = Depends(get_db)):
    """Dispatcher approval — this is what actually bumps risk and affects routing."""
    from datetime import datetime

    row = db.query(Incident).filter(Incident.id == incident_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if row.status == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    row.status = "approved"
    row.reviewed_at = datetime.utcnow()
    db.commit()

    affected = bump_risk_near(row.lat, row.lon, RISK_BUMP_RADIUS_KM, RISK_BUMP_AMOUNT)
    return {"status": "approved", "incident_id": row.id, "edges_affected": affected}


@router.post("/incidents/{incident_id}/reject")
def reject_incident(incident_id: int, db: Session = Depends(get_db)):
    from datetime import datetime

    row = db.query(Incident).filter(Incident.id == incident_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    row.status = "rejected"
    row.reviewed_at = datetime.utcnow()
    db.commit()
    return {"status": "rejected", "incident_id": row.id}


@router.get("/vehicles")
def get_vehicles():
    """Current vehicle positions for the command center map. Placeholder until Phase 4."""
    return {"vehicles": []}
