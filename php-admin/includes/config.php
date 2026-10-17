<?php
// All values come from environment variables — set directly in Render's
// dashboard for the deployed instance, or via local.env.php (gitignored)
// for local development. This file itself has no secrets and is safe to
// commit, which is what makes Docker deployment possible: Render clones
// this repo, and a gitignored config.php simply wouldn't exist for it.

$localEnvFile = __DIR__ . '/local.env.php';
if (file_exists($localEnvFile)) {
    require_once $localEnvFile;
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '5432');
define('DB_NAME', getenv('DB_NAME') ?: 'dbname');
define('DB_USER', getenv('DB_USER') ?: 'user');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_SSLMODE', getenv('DB_SSLMODE') ?: 'require');

// Which FastAPI backend to control — point this at the deployed Render
// URL for the deployed PHP instance, or localhost for local testing.
define('API_BASE_URL', getenv('API_BASE_URL') ?: 'http://localhost:8000/api');

// Demo-only credentials. CHANGE THESE via environment variables for the
// deployed instance — leaving defaults on a public URL is bad practice,
// even for a class project.
define('ADMIN_USERNAME', getenv('ADMIN_USERNAME') ?: 'dispatcher');
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: 'ner2026');
