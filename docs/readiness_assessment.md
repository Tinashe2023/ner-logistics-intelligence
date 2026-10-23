# Government submission readiness assessment

**Assessment date:** 23 October 2026  
**Scope:** static review of the repository on `main` against the supplied SIH 26002 problem statement for the Ministry of Development of North Eastern Region (MDoNER); no separate MDoNER procurement checklist, deployment, infrastructure, formal security audit, or field trial was supplied. See the [requirements traceability matrix](requirements_traceability.md).  
**Disposition:** **not ready for government approval or operational use.** This is an engineering readiness review, not an approval decision or a substitute for the target authority's prescribed review.

## What exists today

- A React/Vite command center and driver demonstration view.
- A FastAPI service that returns corridor routes, risk-map data, and incident operations.
- NetworkX route selection using a hand-weighted cost function and a manually weighted risk score.
- A PHP dispatcher screen that reads a PostgreSQL incidents table and calls the backend for review actions.
- Committed precomputed corridor graph data and a summary of prototype routing experiments.

## Approval blockers observed in code

| Area | Repository evidence | Required outcome before a pilot |
|---|---|---|
| Identity and access | `backend/app/api/routes.py` exposes incident submission, listing, approval, and rejection without authentication or authorization. `php-admin/includes/config.php` has fallback shared credentials; `php-admin/includes/auth.php` compares plaintext values. | Authority-approved identity provider, individual accounts, least-privilege roles, secure credential storage, session protections, login throttling, and audit trails. Protect the API itself, not only its UI. |
| Web security | `backend/app/main.py` allows all CORS origins. PHP review forms have no CSRF token. | Explicit origin allowlist, CSRF defenses, security headers, HTTPS enforcement, input/rate limits, and security testing. |
| State integrity | Approved incident records persist in the database and the graph risk overlay is replayed when the graph loads. Review transitions now accept pending reports only. Reviewer identity, append-only audit history, and administrative correction/rollback are still absent. | Add authenticated reviewer identity and an audit log; make review and risk-event handling transactionally traceable; define correction workflows. |
| Data and model validity | `backend/app/risk/risk_score.py` uses fixed weights and normalization constants. `docs/data_audit.md` is a research plan, not a provenance register. No calibration, uncertainty, or field validation is evidenced. | Trace every dataset to source, license, date, coverage, quality checks, and update cadence. Validate with domain experts and held-out historical/field events; document uncertainty and limits. |
| Route safety | `backend/app/api/routes.py` snaps named locations to nearest graph nodes. Cost weights and risk-bump radius are code constants. Weather context is fetched from Open-Meteo for four fixed points but is not used in routing; no live closure, vehicle, emergency override, or route safety constraint is evidenced. | Define operating domain and safety constraints with road authorities; validate graph coverage, weather representation, and restrictions; show data freshness and degraded-mode behavior; require human dispatch judgment. |
| Availability and operations | No deployment/operations runbook, monitoring, backup/restore evidence, migration strategy, incident response, or service-level target is in the repository. The PHP panel requires PostgreSQL while backend local default is SQLite. Weather context depends on backend outbound access to Open-Meteo and degrades to a visible unavailable/stale state. | Approved hosting/data residency, managed secrets, schema migrations, backups with restore drills, monitoring/alerting, capacity and recovery objectives, and tested deployment procedures. |
| Privacy and records | Incident payload stores exact coordinates, description, and timestamps without a retention, access, consent, or deletion policy. | Privacy impact assessment, data minimization, retention schedule, lawful basis/notice, access logging, and records-management approval. |
| Accessibility and field use | UI is a browser prototype. Driver reports and photo blobs now queue in browser IndexedDB and retry after reconnection with stable request IDs; browser storage remains unencrypted. Photo upload code targets a private Backblaze B2 bucket, but a live upload has not been verified. Connectivity simulation remains available for demos. | Accessibility review against applicable standards, device/network field trials, protected offline storage, and usability validation with intended users. |
| Verification | No automated test suite or CI workflow is present in tracked files; `experiments/results_summary.md` reports a small prototype experiment without reproducible methodology or confidence bounds. | Automated unit/integration/security tests, reproducible benchmark pipeline, traceable requirements, signed release artifacts, and independent verification. |

## Recommended delivery gates

1. **Confirm the target:** identify the approving department, scheme/tender, operational owner, pilot geography, users, data classes, hosting constraints, and the exact submission checklist.
2. **Make a safe pilot foundation:** add authenticated identity and roles, API authorization, CSRF/CORS protections, persistent review/risk events, schema migrations, secrets management, logging, and recovery procedures.
3. **Establish evidence:** create a data provenance register; document algorithm behavior and limitations; validate route/risk outcomes against agreed historical and field cases; publish reproducible performance and error measures.
4. **Run a controlled pilot:** shadow-mode comparison with current dispatch practices, human approval for every decision, field usability/accessibility testing, failure drills, and sign-off by operational and information-security owners.
5. **Prepare the actual submission:** map evidence to the authority's checklist and include architecture, threat/privacy assessments, test reports, SOPs, maintenance/support ownership, and pilot results.

## Information needed to tailor the next implementation tranche

- The MDoNER/SIH evaluation rubric or submission format, if one is available.
- Whether this is a hackathon/prototype evaluation, a limited pilot, or production rollout.
- Target hosting and identity requirements, plus who owns dispatch decisions and operational support.
- Permission and provenance details for the graph, terrain/weather data, incident records, and any proposed field data.

Until these points and the technical blockers above are addressed, present the system as a research/demo prototype and keep it off public and government networks.
