# NER Logistics Intelligence Platform

SIH 26002 research and demonstration prototype for comparing routes and reviewing field reports on a Guwahati–Tawang corridor. It combines a React/Vite web app, a FastAPI backend, and a PHP dispatcher panel.

> **Project status:** This is a demo prototype, not an operational transport or emergency-response system. Its route risk scores are hand-weighted heuristics, its regional view contains synthetic examples, and its data and workflows have not been field-validated or security-reviewed. Do not use it to make real-world safety or dispatch decisions.

## What the prototype includes

- Distance-baseline and heuristic risk-aware route comparisons on a precomputed Guwahati–Tawang graph.
- A map with corridor risk factors, northeastern India district boundaries, Open-Meteo context for four fixed locations, simulated vehicle movement along static OSRM/OpenStreetMap road routes, and dashboard demo alerts.
- A movement-visibility page for a simulated Guwahati–Itanagar shipment, including two alternate road paths, incident markers, dispatcher-approval-based rerouting, road ETA, and simulated arrival status.
- An optional read-only AI logistics analyst, using Gemini with optional Groq fallback, that summarizes graph data and incident reports.
- Field incident reporting, a browser-based offline report/photo queue, and a PHP dispatcher panel for reviewing reports.
- Optional private Backblaze B2 photo storage integration. Live bucket upload and download should be verified in the target environment.
- An illustrative eight-state regional dashboard with synthetic situations and shipments; the routable graph remains the Guwahati–Tawang corridor.

## Repository layout

- `backend/` — FastAPI API, route and risk logic, incident database models, optional AI analyst, and corridor data.
- `frontend/` — React/Vite command center and driver demonstration views.
- `php-admin/` — PHP dispatcher login and incident review panel.
- `experiments/` — prototype routing experiment results.

## Run locally

Run each service in a separate terminal from the repository root. Use demo data only.

### 1. FastAPI backend

Create and activate a Python environment, then install backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`; interactive docs are at `http://localhost:8000/docs`.

Copy `backend/.env.example` to `backend/.env` and set the values needed for the features you want to run:

- `DATABASE_URL` — optional PostgreSQL connection string; without it the backend uses local SQLite.
- `FRONTEND_ORIGINS` — comma-separated browser origins permitted by CORS. For deployment, set this to the frontend's exact origin.
- `GEMINI_API_KEY` — optional key for the AI analyst. `GEMINI_MODEL` defaults to `gemini-flash-lite-latest`.
- `GROQ_API_KEY` — optional backup provider used if Gemini fails, or the sole provider if no Gemini key is configured. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`.
- `B2_BUCKET_NAME`, `B2_REGION`, `B2_KEY_ID`, `B2_APPLICATION_KEY` — optional Backblaze B2 photo storage settings. Use a private bucket and a narrowly scoped key.

Keep real credentials in ignored environment files or the hosting provider's secret settings. Never commit them or put AI provider keys in frontend variables. AI questions send the user's prompt, recent chat turns, a compact graph summary, historical incident data, and up to 30 current field reports to the configured provider; avoid personal or confidential report content.

### 2. React frontend

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. The frontend uses `VITE_API_BASE_URL` when set and otherwise calls `http://localhost:8000/api`. For a deployed frontend, configure `VITE_API_BASE_URL` in its hosting settings as the deployed backend URL ending in `/api`, then rebuild/redeploy the frontend.

### 3. PHP dispatcher panel

The panel requires PHP with PDO PostgreSQL (`pdo_pgsql`) and cURL enabled. The panel and backend must use the same PostgreSQL database to share incidents. Copy `php-admin/includes/local.env.php.example` to `php-admin/includes/local.env.php` and configure the database values, `API_BASE_URL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`.

```powershell
cd php-admin
php -S localhost:8080 -t public
```

Open `http://localhost:8080`. The fallback `dispatcher` / `ner2026` credentials are for local demo use only; explicitly configure unique credentials for any hosted demo.

## Deployment configuration

The frontend and backend are separate services. Set `VITE_API_BASE_URL` on the frontend host to `https://<backend-host>/api`. On the backend host (for example, Render), configure the required runtime values in that service's environment settings, including provider keys if enabling AI, `FRONTEND_ORIGINS` for the deployed frontend origin, and `DATABASE_URL` when using PostgreSQL. Add B2 settings only if photo storage is enabled. Keep secret values out of the repository. After changing frontend build variables, redeploy the frontend; after changing backend environment variables, restart or redeploy the backend service.

The local frontend example currently points at the project's Render API URL. Hosting dashboard values are external to this repository and must be checked in the relevant Render/Vercel project settings.

## Known limitations

- The risk model is a fixed weighted heuristic, not a trained or validated predictor. Weather context does not change route risk.
- There is no live road-closure, government-system, vehicle GPS, or delivery feed. Simulated alerts, vehicles, regional routes, and shipments are demonstration fixtures.
- The routable and risk-scored network covers the Guwahati–Tawang corridor only; the eight-state display is schematic.
- Regional shipment paths are static OSRM routes on OpenStreetMap road data, retrieved November 5, 2026. Marker movement is an accelerated visual simulation along those paths, not live tracking, traffic-aware navigation, or a verified truck itinerary. © OpenStreetMap contributors; road data is available under the Open Database License (ODbL).
- New driver reports identify one of the six simulated shipment IDs and capture its simulated route progress. Once the API receives the report, that vehicle pauses for dispatcher review. A report not approved within 22 seconds sends that vehicle back to the route's source; rejecting a report resumes its journey. Approving without alerting the road team reroutes SIM-101 to the fastest clear precomputed alternative (or its least-affected alternative when every path has a nearby report); the vehicle returns to its source first, the route changes there, and movement resumes from the new route's origin. **Approve & alert team** is a single atomic action: the vehicle waits for clearance and continues on its current route without recalculating it. The other five shipments have no alternate route in this demo, so an approved report affecting their route leaves the vehicle stopped until dispatch alerts the road-clearance team. The simulator marks the road clear after 10 seconds, then the vehicle continues. Incident vehicle, driver, progress, and road-team timestamps are stored on the `incidents` table; backend startup adds these nullable columns to existing databases. Older/unassigned reports remain reviewable but do not stop a simulated vehicle. All of this is classroom simulation logic, not production dispatch behavior.
- A `demo_vehicles` database table stores the six demo vehicle IDs, cargo manifests, origins, and destinations. The backend seeds/updates this synthetic catalog at startup, and the AI analyst includes it with recent vehicle-linked field reports so it can answer questions about which vehicle carries a given shipment. `DEMO-DRIVER` on legacy incidents was a placeholder, not a real driver identity; new reports without a signed-in driver leave that field empty.
- The dashboard district layer contains 119 simplified India ADM2 boundaries from geoBoundaries (boundary year 2021; source: Pathways Data Pvt. Ltd./LGDirectory; ODbL 1.0). State assignment was matched against geoBoundaries India ADM1 (boundary year 2011; DataMeet India/Election Commission of India; CC BY 2.5 India). These boundaries may not reflect later administrative changes; verify against current official sources before operational use.
- Incident and review API routes are not authenticated or role-restricted. The PHP panel uses a shared login and lacks CSRF protection and reviewer audit history. Do not expose the services to an untrusted network or use sensitive reports/photos.
- Browser offline data is stored unencrypted in IndexedDB. Authentication, protected local storage, and conflict resolution are not implemented.
- In-memory AI rate limits reset with the backend process and are not a security boundary.
- Backblaze B2 upload/download, production deployment configuration, backups, recovery, and operational monitoring require verification in the target environment.
- The project has not been evaluated against an official MDoNER submission checklist or field-tested with intended users.

Before any pilot, establish approved data sources and use, authentication and authorization, privacy and retention rules, security controls, field validation, accessibility review, operational support, recovery procedures, and approval against the target authority's actual requirements.
