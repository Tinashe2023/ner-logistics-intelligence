# PHP dispatcher panel

This panel provides a local demonstration login and a dispatcher view for reviewing incidents stored by the FastAPI service. It is implemented, but remains a prototype and is not ready for operational deployment.

## Data connection

The panel reads incident and photo metadata directly from PostgreSQL through PDO (`pdo_pgsql`), links to short-lived private Backblaze B2 photo downloads through the FastAPI API, and sends review actions to that API through PHP cURL. The backend and panel must point to the same PostgreSQL database for their views to stay consistent. The backend's default local database is SQLite, so configure `DATABASE_URL` when running the panel with PostgreSQL.

Copy `includes/local.env.php.example` to `includes/local.env.php` for local values, or set environment variables in the runtime. Required settings include `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `API_BASE_URL`. Configure `ADMIN_USERNAME` and `ADMIN_PASSWORD` explicitly. The fallback credentials `dispatcher` / `ner2026` are for local demo use only.

## Local run

From this directory, run `php -S localhost:8080 -t public` and open `http://localhost:8080`.

## Security status

The panel currently has a single shared credential, no role model, no CSRF protection on review actions, and no login throttling. The corresponding backend review endpoints also lack authentication. Do not expose this panel or API to an untrusted network. See the repository's [readiness assessment](../docs/readiness_assessment.md) for required hardening work.
