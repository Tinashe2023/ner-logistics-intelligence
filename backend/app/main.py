"""
NER Logistics Intelligence Platform — API entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

This is intentionally minimal in week 1. The goal is to have something
running end-to-end (even with fake data) as early as possible, rather
than building out the full schema before anything works.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes
from sqlalchemy import inspect, text

from app.db.database import Base, engine, SessionLocal
from app.models import incident  # noqa: F401 — import so the model registers with Base
from app.models.incident import DemoVehicle

Base.metadata.create_all(bind=engine)

# Add the demo dispatch fields to databases created before vehicle-specific
# incident reporting. All columns are nullable so existing reports stay valid.
with engine.begin() as connection:
    incident_columns = {
        column["name"] for column in inspect(connection).get_columns("incidents")
    }
    dispatch_columns = {
        "vehicle_id": "VARCHAR(16)",
        "driver_id": "VARCHAR(64)",
        "vehicle_progress": "FLOAT",
        "team_alerted_at": "TIMESTAMP",
        "road_cleared_at": "TIMESTAMP",
    }
    for column_name, column_type in dispatch_columns.items():
        if column_name not in incident_columns:
            connection.execute(text(
                f"ALTER TABLE incidents ADD COLUMN {column_name} {column_type}"
            ))

DEMO_VEHICLES = (
    ("SIM-101", "Medical kits", "Guwahati", "Itanagar"),
    ("SIM-204", "Food supplies", "Guwahati", "Shillong"),
    ("SIM-318", "Water filters", "Kohima", "Imphal"),
    ("SIM-427", "Emergency blankets", "Guwahati", "Aizawl"),
    ("SIM-536", "Essential medicines", "Guwahati", "Agartala"),
    ("SIM-642", "Relief supplies", "Gangtok", "Guwahati"),
)
with SessionLocal.begin() as session:
    for vehicle_id, cargo, origin, destination in DEMO_VEHICLES:
        session.merge(DemoVehicle(
            id=vehicle_id,
            cargo=cargo,
            origin=origin,
            destination=destination,
        ))

app = FastAPI(
    title="NER Logistics Intelligence Platform",
    description="AI-based smart logistics & accessibility intelligence platform for NER (SIH26002)",
    version="0.1.0",
)

# Set FRONTEND_ORIGINS on the host to a comma-separated list when deploying.
# Keep localhost available for local development and allow the known Vercel UI.
frontend_origins = {
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,https://ner-logistics-intelligence-nine.vercel.app",
    ).split(",")
    if origin.strip()
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(frontend_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ner-logistics-intelligence"}
