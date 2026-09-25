<?php
// Path to the same SQLite database FastAPI uses (backend/data/app.db).
// At deploy time, if backend/app/db/database.py is switched to Postgres,
// update these two files to use a Postgres PDO DSN instead.
define('DB_PATH', __DIR__ . '/../../backend/data/app.db');

// FastAPI backend base URL — approve/reject actions call through here
// rather than writing to the DB directly, so the risk bump actually happens.
define('API_BASE_URL', 'http://localhost:8000/api');

// Demo-only credentials. Not production-grade — fine for a class project,
// but say so explicitly in your report rather than implying otherwise.
define('ADMIN_USERNAME', 'dispatcher');
define('ADMIN_PASSWORD', 'ner2026');
