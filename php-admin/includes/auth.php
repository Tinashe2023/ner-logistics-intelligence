<?php
require_once __DIR__ . '/config.php';

// Start a session only if one isn't already active. Calling session_start()
// twice emits a notice, and any output before a header() redirect breaks it.
function ensure_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function require_login(): void {
    ensure_session();
    if (empty($_SESSION['logged_in'])) {
        header('Location: index.php');
        exit;
    }
}

function attempt_login(string $username, string $password): bool {
    ensure_session();
    if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
        $_SESSION['logged_in'] = true;
        $_SESSION['username'] = $username;
        return true;
    }
    return false;
}

function logout(): void {
    ensure_session();
    session_destroy();
}