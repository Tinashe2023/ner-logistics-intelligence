# SIH 26002 requirements traceability

**Target:** Ministry of Development of North Eastern Region (MDoNER)  
**Basis:** problem statement supplied in this project conversation. This matrix is a repository-level gap review, not an official compliance checklist.

Status key: **Partial demo** means a related code path exists but does not meet the stated operational capability. **Missing** means no implementation was found in the reviewed repository. **Evidence gap** means a prototype claim lacks validation artifacts.

## Functional requirements

| Problem statement requirement | Current repository evidence | Status | Upgrade and acceptance evidence |
|---|---|---|---|
| a. Monitor real-time road, bridge, and transport accessibility across districts and remote locations | Static, precomputed Guwahati–Tawang corridor graph; `/api/network/risk-map`; no live feeds or district-wide coverage | Partial demo | Define geographic and asset scope; ingest authoritative status updates; show source, timestamp, and stale-data state per segment/bridge; verify coverage against an agreed reference inventory. |
| b. Predict disruption from landslides, floods, heavy rainfall, damage, or congestion | Fixed weighted heuristic in `backend/app/risk/risk_score.py`; no trained predictor or validated forecast pipeline | Partial demo | Establish labeled, dated event history and input data quality; calibrate and evaluate with held-out time periods and locations; publish precision/recall, lead time, calibration, uncertainty, and known limits. |
| c. Suggest alternate routes and estimated delays | `/api/route` returns a risk-weighted route and distance baseline with prototype travel-time totals | Partial demo | Add validated closure/access constraints, vehicle/commodity constraints and dynamic travel-time inputs; test against blocked and safe routes; show route rationale and estimate freshness. |
| d. Track essential-goods vehicles via GPS | `/api/vehicles` returns an empty list; no GPS integration | Missing | Define consent, device/source, update frequency, coverage, retention, access controls, and loss-of-signal behavior; demonstrate end-to-end GPS ingestion with simulated and field devices. |
| e. Generate automated alerts for closures, inaccessibility, delays, and high-risk corridors | UI marks risk hotspots; no alert rules, notification service, subscriber model, or delivery receipts | Missing | Define event thresholds, recipients, escalation, deduplication, multilingual templates, delivery channels, and audit history; verify alerts under normal and failure conditions. |
| f. Let field officials upload geo-tagged updates, photos, and incident reports remotely | Driver demo submits a text incident at a few preset points; API accepts coordinates and text; no photo upload or official identity | Partial demo | Add authenticated field workflow, arbitrary validated coordinates, media upload and metadata handling, offline durability, abuse controls, and review/audit records; demonstrate sync through poor connectivity. |
| g. Central dashboards: district connectivity, bottlenecks/supply gaps, emergency routes, essential-supply movement/delivery | Dashboard shows one corridor map, risk hotspots, and route comparison; no district view, commodity inventory, delivery status, or supply-gap model | Partial demo | Define data owners and indicators; build district and emergency views using authoritative data; validate each KPI and map layer with its owner; demonstrate shipment lifecycle and data freshness. |
| h. Multilingual notifications and offline sync for low-network areas | English-only UI; offline mode is a manually toggled in-memory queue that is lost on reload | Missing | Agree supported languages and translations with users; implement durable encrypted local queue, retry/idempotency/conflict handling, visible sync state, and language selection; pass field usability and data-loss tests. |
| GIS mapping | React Leaflet map with OpenStreetMap tiles and project graph layers | Partial demo | Document source/licensing/attribution, coordinate reference, coverage, update process, and offline map strategy; verify geometry and accessible map alternatives. |
| Weather API integration | No weather client or scheduled ingestion in application runtime | Missing | Select an approved provider/data agreement; persist forecast/observation source and timestamp; handle outages and stale data; validate values and their use in risk estimates. |
| Transport database and government system integration | No integration connectors or interface contracts found | Missing | Identify systems, owners, data-sharing approvals, schemas, authentication, network zones, and SLAs; implement versioned adapters and contract tests. |
| Scalable cloud infrastructure and secure data management | Repository mentions Render/Vercel in old docs; no deployment manifests, security architecture, scale/availability evidence, or recovery runbook | Missing / evidence gap | Obtain hosting and data-residency requirements; document threat/privacy models, IAM, secrets, encryption, backup/restore, monitoring, incident response, capacity tests, and release controls. |

## Delivery order recommended for this repository

1. **Constrain the prototype claim:** keep the one-corridor research/demo scope explicit and ensure no demo route is presented as live regional accessibility advice.
2. **Define an end-to-end pilot slice:** choose one district/corridor, one commodity workflow, data owners, field users, target devices/network conditions, and measurable outcomes with MDoNER or the sponsoring evaluator.
3. **Harden the data and incident workflow:** authenticated roles for reporters/reviewers, API authorization, persistent incident and review events, CSRF protection, controlled CORS, input validation, privacy/retention rules, and durable offline sync.
4. **Add trustworthy live inputs:** authoritative road closures and weather first, with source timestamps and stale-data handling; add GPS only after the privacy and operational rules are agreed.
5. **Validate routing and risk:** establish labeled reference cases and field review; compare against current dispatch practice; make uncertainty and route restrictions visible; keep human dispatch approval in the loop.
6. **Expand dashboards, alerts, language, and integrations:** implement against confirmed data contracts and user-tested requirements rather than assumed metrics.
7. **Prepare submission evidence:** architecture and data-flow diagrams, source/license register, evaluation results, threat/privacy assessments, accessibility report, SOPs, recovery drills, and a requirement-by-requirement demo script.

## Claims the current build should not make

- Region-wide or real-time accessibility monitoring.
- Predictive AI/ML performance or proven disruption prediction.
- Live vehicle tracking or delivery visibility.
- Automated alerting or government-system integration.
- Production-ready offline synchronization, secure data management, or operational readiness.

These are goals in the supplied problem statement, not capabilities evidenced by the current repository.
