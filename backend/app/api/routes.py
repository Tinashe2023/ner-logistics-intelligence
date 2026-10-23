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
import hashlib
import networkx as nx
import requests
import time
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.responses import RedirectResponse

from app.db.database import get_db
from app.db.graph_loader import bump_risk_near, get_coords, get_edges_raw, get_graph, nearest_node
from app.models.incident import Incident, IncidentPhoto, IncidentSubmission
from app.risk.risk_score import SegmentFeatures, explain_risk_score
from app.routing.risk_aware_router import shortest_risk_aware_path
from app.storage.b2 import create_download_url, delete_object, is_configured, upload_object

router = APIRouter()

LOCATIONS = {
    "guwahati": (26.1445, 91.7362),
    "tawang": (27.5859, 91.8594),
    "tezpur": (26.6528, 92.7926),
    "bomdila": (27.2649, 92.4021),
    "dirang": (27.3557, 92.2373),
}

RISK_BUMP_RADIUS_KM = 15.0  # widened from 5.0 — testing showed 5km rarely reaches a real branch
                             # point, so an approved incident often changed cost without changing
                             # the route at all. 15km matches what Experiment 2 confirmed works.
RISK_BUMP_AMOUNT = 0.4      # raised from 0.3 to more reliably tip the routing decision

WEATHER_POINTS = [
    {"name": "Guwahati", "lat": 26.1445, "lon": 91.7362},
    {"name": "Tenga Valley", "lat": 27.1500, "lon": 92.4700},
    {"name": "Sela Pass", "lat": 27.5073, "lon": 92.0827},
    {"name": "Tawang", "lat": 27.5859, "lon": 91.8594},
]
WEATHER_CACHE_SECONDS = 600
_weather_cache = None
_weather_cache_time = 0.0


class RouteRequest(BaseModel):
    origin: str
    destination: str


class IncidentCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    type: str = Field(pattern="^(landslide|flood|road_damage|road_blockage|other)$")
    severity: str = Field(pattern="^(minor|moderate|severe)$")
    description: str | None = Field(default=None, max_length=1000)


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

        features = SegmentFeatures(
            rainfall_mm_24h=e.get("rainfall_mm_24h", 0.0),
            slope_degrees=e.get("slope_degrees", 0.0),
            historical_incident_count=e.get("historical_incident_count", 0),
            elevation_m=e.get("elevation_m", 0.0),
            river_proximity_m=e.get("river_proximity_m", 999999),
            road_condition_score=e.get("road_condition_score", 0.5),
        )

        hotspots.append({
            "lat": mid_lat, "lon": mid_lon,
            "risk_score": e.get("risk_score", 0.0),
            "osm_name": e.get("osm_name", "unnamed"),
            "factors": explain_risk_score(features),
        })

    return {"spine": spine, "hotspots": hotspots}


@router.get("/weather/corridor")
def get_corridor_weather():
    """Return a cached Open-Meteo snapshot for named points on the demo corridor."""
    global _weather_cache, _weather_cache_time
    now = time.monotonic()
    if _weather_cache is not None and now - _weather_cache_time < WEATHER_CACHE_SECONDS:
        return {**_weather_cache, "stale": False}

    params = {
        "latitude": ",".join(str(point["lat"]) for point in WEATHER_POINTS),
        "longitude": ",".join(str(point["lon"]) for point in WEATHER_POINTS),
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
        "hourly": "precipitation,precipitation_probability",
        "forecast_hours": 6,
        "timezone": "Asia/Kolkata",
    }
    try:
        response = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=8)
        response.raise_for_status()
        payload = response.json()
        locations = payload if isinstance(payload, list) else [payload]
        points = []
        for index, point in enumerate(WEATHER_POINTS):
            if index >= len(locations):
                continue
            location_data = locations[index]
            current = location_data.get("current", {})
            hourly = location_data.get("hourly", {})
            points.append({
                **point,
                "current_time": current.get("time"),
                "temperature_c": current.get("temperature_2m"),
                "relative_humidity_percent": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "weather_code": current.get("weather_code"),
                "forecast_times": hourly.get("time", []),
                "forecast_precipitation_mm": hourly.get("precipitation", []),
                "forecast_precipitation_probability_percent": hourly.get("precipitation_probability", []),
            })
        if not points:
            raise ValueError("Weather provider returned no corridor locations")
        _weather_cache = {
            "source": "Open-Meteo forecast model",
            "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "stale": False,
            "risk_model_uses_weather": False,
            "points": points,
        }
        _weather_cache_time = now
        return _weather_cache
    except (requests.RequestException, ValueError) as exc:
        if _weather_cache is not None:
            return {**_weather_cache, "stale": True}
        raise HTTPException(status_code=503, detail="Corridor weather is temporarily unavailable") from exc


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
def report_incident(
    incident: IncidentCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    """Save a pending field report; repeated keyed requests return the original row."""
    if idempotency_key is not None:
        idempotency_key = idempotency_key.strip()
        if not idempotency_key or len(idempotency_key) > 128:
            raise HTTPException(status_code=400, detail="Idempotency-Key must contain 1–128 characters")
        existing = db.query(IncidentSubmission).filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return {"status": "received", "incident_id": existing.incident_id, "duplicate": True}

    row = Incident(
        lat=incident.lat, lon=incident.lon, type=incident.type,
        severity=incident.severity, description=incident.description,
        status="pending",
    )
    db.add(row)
    try:
        db.flush()
        if idempotency_key is not None:
            db.add(IncidentSubmission(idempotency_key=idempotency_key, incident_id=row.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key is not None:
            existing = db.query(IncidentSubmission).filter_by(idempotency_key=idempotency_key).first()
            if existing:
                return {"status": "received", "incident_id": existing.incident_id, "duplicate": True}
        raise
    db.refresh(row)
    return {"status": "received", "incident_id": row.id, "duplicate": False}


@router.get("/incidents")
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    """Used by the PHP admin panel to show pending/approved/rejected reports."""
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    rows = query.order_by(Incident.reported_at.desc()).all()
    incident_ids = [row.id for row in rows]
    photos_by_incident = {}
    if incident_ids:
        photos = db.query(IncidentPhoto).filter(IncidentPhoto.incident_id.in_(incident_ids)).all()
        for photo in photos:
            photos_by_incident.setdefault(photo.incident_id, []).append({
                "id": photo.id,
                "content_type": photo.content_type,
                "download_path": f"/api/incidents/{photo.incident_id}/photos/{photo.id}/download",
            })
    return [
        {
            "id": r.id, "lat": r.lat, "lon": r.lon, "type": r.type,
            "severity": r.severity, "description": r.description,
            "status": r.status, "reported_at": r.reported_at.isoformat(),
            "photos": photos_by_incident.get(r.id, []),
        }
        for r in rows
    ]


@router.post("/incidents/{incident_id}/photos")
async def upload_incident_photo(
    incident_id: int,
    photo: UploadFile = File(...),
    client_photo_id: str = Header(..., alias="Idempotency-Key", min_length=1, max_length=128),
    db: Session = Depends(get_db),
):
    """Store one bounded image in private B2 storage and persist its metadata."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    client_photo_id = client_photo_id.strip()
    if not client_photo_id or len(client_photo_id) > 128:
        raise HTTPException(status_code=400, detail="Idempotency-Key must contain 1–128 characters")

    prior = db.query(IncidentPhoto).filter_by(client_photo_id=client_photo_id).first()
    if prior:
        if prior.incident_id != incident_id:
            raise HTTPException(status_code=409, detail="Photo retry key belongs to another incident")
        return {"status": "stored", "photo_id": prior.id, "duplicate": True}
    photo_count = db.query(IncidentPhoto).filter_by(incident_id=incident_id).count()
    if photo_count >= 3:
        raise HTTPException(status_code=409, detail="A report can include at most 3 photos")

    declared_type = (photo.content_type or "").lower()
    signatures = {
        "image/jpeg": (b"\xff\xd8\xff", "jpg"),
        "image/png": (b"\x89PNG\r\n\x1a\n", "png"),
        "image/webp": (None, "webp"),
    }
    if declared_type not in signatures:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP image")
    content = await photo.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Each photo must be 5 MiB or smaller")
    signature, extension = signatures[declared_type]
    if signature and not content.startswith(signature):
        raise HTTPException(status_code=415, detail="Image content does not match its file type")
    if declared_type == "image/webp" and not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
        raise HTTPException(status_code=415, detail="Image content does not match its file type")
    if not content:
        raise HTTPException(status_code=400, detail="Photo file is empty")
    if not is_configured():
        raise HTTPException(status_code=503, detail="Photo storage is not configured on the backend")

    digest = hashlib.sha256(client_photo_id.encode("utf-8")).hexdigest()
    object_key = f"incident-photos/{incident_id}/{digest}.{extension}"
    try:
        await run_in_threadpool(upload_object, object_key, content, declared_type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Photo storage is temporarily unavailable") from exc

    row = IncidentPhoto(
        incident_id=incident_id,
        client_photo_id=client_photo_id,
        object_key=object_key,
        content_type=declared_type,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError:
        db.rollback()
        prior = db.query(IncidentPhoto).filter_by(client_photo_id=client_photo_id).first()
        if prior and prior.incident_id == incident_id:
            return {"status": "stored", "photo_id": prior.id, "duplicate": True}
        raise HTTPException(status_code=409, detail="Photo was already submitted with a different key")
    except Exception:
        db.rollback()
        try:
            await run_in_threadpool(delete_object, object_key)
        except Exception:
            pass
        raise
    return {"status": "stored", "photo_id": row.id, "duplicate": False}


@router.get("/incidents/{incident_id}/photos/{photo_id}/download")
def download_incident_photo(incident_id: int, photo_id: int, db: Session = Depends(get_db)):
    row = db.query(IncidentPhoto).filter_by(id=photo_id, incident_id=incident_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    try:
        url = create_download_url(row.object_key)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Photo storage is temporarily unavailable") from exc
    return RedirectResponse(url=url, status_code=307)


@router.post("/incidents/{incident_id}/approve")
def approve_incident(incident_id: int, db: Session = Depends(get_db)):
    """Dispatcher approval — persists the review and updates the route cache."""
    from datetime import datetime

    row = db.query(Incident).filter(Incident.id == incident_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail=f"Cannot approve an incident with status '{row.status}'")

    # Load/replay the pre-existing approvals before committing this one, so
    # the new record is applied exactly once in the current process.
    get_graph()

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
    if row.status != "pending":
        raise HTTPException(status_code=409, detail=f"Cannot reject an incident with status '{row.status}'")
    row.status = "rejected"
    row.reviewed_at = datetime.utcnow()
    db.commit()
    return {"status": "rejected", "incident_id": row.id}


@router.get("/vehicles")
def get_vehicles():
    """Current vehicle positions for the command center map. Placeholder until Phase 4."""
    return {"vehicles": []}
