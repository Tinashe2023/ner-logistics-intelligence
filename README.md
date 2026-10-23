# NER Logistics Intelligence Platform (SIH26002)

An early-stage decision-support prototype for monitoring and comparing road routes on a Guwahati–Tawang corridor. It combines a React map, a FastAPI routing and incident API, and a PHP dispatcher review panel.

> **Readiness:** research/demo prototype for SIH 26002. This repository is not ready for operational use or government approval. It has not been security-reviewed, field-validated, or assessed against an official MDoNER submission checklist. See the [SIH 26002 requirements traceability matrix](docs/requirements_traceability.md) and [readiness assessment](docs/readiness_assessment.md).

## Current capabilities

- Compare a distance-based baseline route with a heuristic risk-aware route.
- Display corridor risk hotspots and the factors used by the current weighted score.
- Show Open-Meteo forecast context at four fixed corridor points; it is not used to alter route scores.
- Animate one clearly labelled simulated vehicle along the selected corridor route; no GPS feed is connected.
- Show dashboard-only demo alerts from heuristic risk, severe reports, reviewed blockage reports, and explicitly marked rainfall thresholds; no notification service is connected.
- Submit incident reports and review them through a dispatcher panel.
- Attach up to three JPEG, PNG, or WebP field photos to a report; the backend is wired for private Backblaze B2 storage and short-lived dispatcher download links (live bucket upload remains to be verified).
- Demonstrate an offline report and photo queue in browser IndexedDB that survives reloads and retries on reconnect; browser storage is unencrypted, so this is not a production offline-sync system.

## Architecture

- `backend/`: FastAPI API, SQLAlchemy incident model, NetworkX route calculation, and precomputed corridor data.
- `frontend/`: React/Vite command center and driver demonstration view.
- `php-admin/`: PHP dispatcher login and incident review panel.
- `backend/scripts/`: data preparation and experiment scripts.
- `docs/`: data notes and readiness assessment.

## Run locally

See [RUNNING.md](RUNNING.md) for the three-service setup. Use only synthetic/demo data locally. The sample dispatcher credentials are for local demonstration and must not be used on a reachable deployment.

## Evidence and limitations

The route cost and risk score are hand-weighted heuristics, not a validated predictive model. The committed experiment summary is a prototype result and does not establish operational accuracy or safety. Approved incident records are stored in the database and their risk overlay is rebuilt when the backend graph loads, but there is no reviewer identity or append-only audit history. Incident API actions currently lack authentication and authorization. The PHP admin has local demo credential fallbacks when runtime credentials are not configured; production credentials must be set in the hosting environment. Do not expose this deployment to public or government networks.

Before any pilot, complete the security, data provenance, field validation, operational reliability, accessibility, and governance work in [docs/readiness_assessment.md](docs/readiness_assessment.md), then obtain review against the actual authority's requirements.
