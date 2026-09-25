<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/config.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: incidents.php');
    exit;
}

$id = (int)($_POST['id'] ?? 0);
$action = $_POST['action'] ?? '';

if (!$id || !in_array($action, ['approve', 'reject'], true)) {
    $_SESSION['flash'] = 'Invalid request.';
    header('Location: incidents.php');
    exit;
}

$url = API_BASE_URL . "/incidents/{$id}/{$action}";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

session_start();
if ($curlError) {
    $_SESSION['flash'] = "Could not reach the backend API: {$curlError}. Is FastAPI running on " . API_BASE_URL . "?";
} elseif ($httpCode >= 200 && $httpCode < 300) {
    $data = json_decode($response, true);
    if ($action === 'approve') {
        $affected = $data['edges_affected'] ?? '?';
        $_SESSION['flash'] = "Incident #{$id} approved — risk updated on {$affected} nearby road segments.";
    } else {
        $_SESSION['flash'] = "Incident #{$id} rejected.";
    }
} else {
    $_SESSION['flash'] = "Backend returned an error (HTTP {$httpCode}): " . htmlspecialchars($response);
}

header('Location: incidents.php');
exit;
