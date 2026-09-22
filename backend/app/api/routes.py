"""
API routes for the core intelligence loop:

  get road graph -> get risk-aware route -> report incident -> get updated risk map

Week 1 goal: these return hardcoded/synthetic data so the frontend and
routing engine can be built against a stable contract. Wire in the real
road graph + risk model once Phase 0/1 are done (see docs/).
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RouteRequest(BaseModel):
    origin: str
    destination: str


class Incident(BaseModel):
    lat: float
    lon: float
    type: str
    severity: str
    description: str | None = None


@router.get("/network/risk-map")
def get_risk_map():
    """Returns current risk score per road segment. Placeholder data for now."""
    return {"segments": []}


@router.post("/route")
def get_route(req: RouteRequest):
    """Returns a risk-aware route between origin and destination. Placeholder for now."""
    return {"origin": req.origin, "destination": req.destination, "path": [], "risk_cost": None}


@router.post("/incidents")
def report_incident(incident: Incident):
    """Driver/field report of a road incident. Triggers risk recalculation once wired up."""
    return {"status": "received", "incident": incident}


@router.get("/vehicles")
def get_vehicles():
    """Current vehicle positions for the command center map. Placeholder for now."""
    return {"vehicles": []}
