<?php
require_once __DIR__ . '/config.php';

function require_login(): void {
    session_start();
    if (empty($_SESSION['logged_in'])) {
        header('Location: index.php');
        exit;
    }
}

function attempt_login(string $username, string $password): bool {
    session_start();
    if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
        $_SESSION['logged_in'] = true;
        $_SESSION['username'] = $username;
        return true;
    }
    return false;
}

function logout(): void {
    session_start();
    session_destroy();
}
