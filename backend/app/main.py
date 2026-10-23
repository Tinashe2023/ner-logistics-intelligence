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
from app.db.database import Base, engine
from app.models import incident  # noqa: F401 — import so the model registers with Base

Base.metadata.create_all(bind=engine)

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
