"""
NER Logistics Intelligence Platform — API entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

This is intentionally minimal in week 1. The goal is to have something
running end-to-end (even with fake data) as early as possible, rather
than building out the full schema before anything works.
"""
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

# Allow the React dev server (and later, the deployed frontend) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ner-logistics-intelligence"}
