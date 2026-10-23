# Local demo setup

Run these services in separate terminals from the repository root. Use demo data only; the current authentication and persistence setup is not suitable for a public deployment.

## 1. FastAPI backend

```powershell
cd backend
conda activate ner-logistics
uvicorn app.main:app --reload --port 8000
```

If you do not use Conda, create and activate a Python virtual environment and install `backend/requirements.txt` first. After pulling changes that add backend packages, rerun `pip install -r requirements.txt` from `backend/`. The API docs are at `http://localhost:8000/docs`.

For field-photo uploads, copy `backend/.env.example` to `backend/.env` and set `B2_BUCKET_NAME`, `B2_REGION`, `B2_KEY_ID`, and `B2_APPLICATION_KEY`. Use a private bucket and a bucket-restricted application key with read/write access limited to `incident-photos/`. Keep the `.env` file local and never commit or share the application key. The driver can queue photos offline; upload begins after connectivity returns.

## 2. React frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). `frontend/.env.example` documents the optional API base URL; local development defaults to `http://localhost:8000/api`.

## 3. PHP dispatcher panel

The PHP panel uses PostgreSQL through PDO, while the backend defaults to SQLite unless `DATABASE_URL` is configured. To have both services share incidents, configure the backend and PHP panel to use the same PostgreSQL database and ensure PHP has the `pdo_pgsql` and `curl` extensions enabled. Copy `php-admin/includes/local.env.php.example` to `php-admin/includes/local.env.php` and set local-only environment values there.

```powershell
cd php-admin
php -S localhost:8080 -t public
```

Open `http://localhost:8080`. Local demo defaults are `dispatcher` / `ner2026`; they must be overridden before any network-accessible deployment. The panel's direct database reads require the backend's `incidents` table to exist in that same PostgreSQL database.

## Known demo limitations

- Incident reporting and review API routes are not authenticated or role-restricted.
- CORS uses the `FRONTEND_ORIGINS` comma-separated setting. Its default includes localhost and the configured Vercel frontend; set the production value explicitly in Render.
- Approved incident risk overlays are rebuilt from approved database records when the graph loads; use the same database for the backend and PHP panel to share reviews.
- The driver's report and photo queue survives reloads in browser IndexedDB; data is unencrypted. Stable request IDs prevent duplicate rows after retry, but authentication, protected local storage, and conflict resolution are not implemented.
- Backblaze photo uploads depend on valid backend credentials and network access. This integration has not yet been verified with a live bucket upload.
- Incident and photo API routes are unauthenticated; do not upload sensitive or identifying images.
- This setup is for local demonstration, not operational use.
