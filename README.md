# NER Logistics Intelligence Platform (SIH26002)

AI-based smart logistics & accessibility intelligence platform for the
North Eastern Region (NER) of India — built for SIH26002.

## Core loop
Environmental conditions → disruption/risk prediction → risk-aware route →
driver interface → offline incident capture → sync → updated network
intelligence → rerouting.

## Stack
- **Backend + AI/routing**: Python, FastAPI, PostgreSQL, networkx (risk-aware
  Dijkstra routing)
- **Frontend**: React (dashboard + driver view)
- **Deployment target**: Render (backend + Postgres) / Vercel (frontend)

## Status
Week 1 — data reconnaissance + risk model + routing engine.
See `docs/` for the phase plan and data audit.

## Running locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Visit http://localhost:8000/docs for the interactive API docs.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Repo structure
```
backend/app/
  api/        - FastAPI routes
  risk/       - risk scoring model
  routing/    - risk-aware routing engine (networkx)
  models/     - DB models
  db/         - DB connection/session setup
frontend/src/
  components/ - shared UI components
  pages/      - dashboard, driver view
  map/        - map rendering
docs/         - phase plan, data audit, architecture notes
experiments/  - benchmark scripts (baseline vs fastest vs risk-aware routing)
```
