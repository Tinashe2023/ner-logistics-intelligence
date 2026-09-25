"""
Incident model — a field/driver report of a road disruption. Starts as
'pending', and only affects the risk-aware routing graph once a dispatcher
approves it (via the PHP admin panel, or the /api/incidents/{id}/approve
endpoint directly for now). This mirrors the real workflow: an unverified
report shouldn't silently change routing decisions.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

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
