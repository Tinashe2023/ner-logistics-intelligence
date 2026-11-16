"""
Incident model — a field/driver report of a road disruption. Starts as
'pending', and only affects the risk-aware routing graph once a dispatcher
approves it (via the PHP admin panel, or the /api/incidents/{id}/approve
endpoint directly for now). This mirrors the real workflow: an unverified
report shouldn't silently change routing decisions.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from app.db.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    type = Column(String, nullable=False)          # landslide, flood, road_damage, other
    severity = Column(String, nullable=False)       # minor, moderate, severe
    description = Column(String, nullable=True)
    status = Column(String, default="pending")      # pending, approved, rejected
    reported_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    vehicle_id = Column(String(16), nullable=True)
    driver_id = Column(String(64), nullable=True)
    vehicle_progress = Column(Float, nullable=True)
    team_alerted_at = Column(DateTime, nullable=True)
    road_cleared_at = Column(DateTime, nullable=True)


class DemoVehicle(Base):
    __tablename__ = "demo_vehicles"

    id = Column(String(16), primary_key=True)
    cargo = Column(String(100), nullable=False)
    origin = Column(String(64), nullable=False)
    destination = Column(String(64), nullable=False)


class IncidentSubmission(Base):
    """Maps a client-generated report ID to its single persisted incident."""

    __tablename__ = "incident_submissions"

    idempotency_key = Column(String(128), primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, unique=True)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class IncidentPhoto(Base):
    """Private B2 object metadata for a field-report photograph."""

    __tablename__ = "incident_photos"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    client_photo_id = Column(String(128), nullable=False, unique=True, index=True)
    object_key = Column(String(512), nullable=False, unique=True)
    content_type = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
