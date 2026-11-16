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
$returnStatus = $_POST['return_status'] ?? '';
if (!in_array($returnStatus, ['pending', 'approved', 'rejected', 'all'], true)) {
    $returnStatus = in_array($action, ['approve', 'alert_team', 'approve_and_alert'], true) ? 'approved' : 'pending';
}

if (!$id || !in_array($action, ['approve', 'reject', 'alert_team', 'approve_and_alert'], true)) {
    $_SESSION['flash'] = 'Invalid request.';
    header('Location: incidents.php?status=' . rawurlencode($returnStatus));
    exit;
}

$apiActions = match ($action) {
    'approve_and_alert' => ['approve-and-alert-team'],
    'alert_team' => ['alert-team'],
    default => [$action],
};
$results = [];
foreach ($apiActions as $apiAction) {
    $url = API_BASE_URL . "/incidents/{$id}/{$apiAction}";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60); // free-tier backend may be waking from sleep
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    $results[] = compact('apiAction', 'response', 'httpCode', 'curlError');
    if ($curlError || $httpCode < 200 || $httpCode >= 300) {
        break;
    }
}

// Session is already active from require_login() — no second session_start().
if ($results[0]['curlError']) {
    $curlError = $results[0]['curlError'];
    $_SESSION['flash'] = "Could not reach the backend API: {$curlError}. Is it running at " . API_BASE_URL . "?";
} elseif ($results[0]['httpCode'] >= 200 && $results[0]['httpCode'] < 300
    && count($results) === count($apiActions)
    && end($results)['httpCode'] >= 200 && end($results)['httpCode'] < 300) {
    $data = json_decode(end($results)['response'], true);
    if (in_array($action, ['approve', 'approve_and_alert'], true)) {
        $approvalData = $action === 'approve_and_alert'
            ? json_decode($results[0]['response'], true)
            : $data;
        $affected = $approvalData['edges_affected'] ?? '?';
        $_SESSION['flash'] = $action === 'approve_and_alert'
            ? "Incident #{$id} approved and road team alerted. Risk updated on {$affected} nearby road segments; the demo vehicle continues on its current route after 10 seconds."
            : "Incident #{$id} approved — risk updated on {$affected} nearby road segments.";
    } elseif ($action === 'reject') {
        $_SESSION['flash'] = "Incident #{$id} rejected.";
    } else {
        $seconds = $data['simulated_clearance_seconds'] ?? 10;
        $_SESSION['flash'] = "Road-clearance team alerted for incident #{$id}. The demo vehicle will continue on its current route after {$seconds} seconds.";
    }
} else {
    $lastResult = end($results);
    $httpCode = $lastResult['httpCode'];
    $response = $lastResult['response'];
    $_SESSION['flash'] = "Backend returned an error (HTTP {$httpCode}): " . $response;
}

header('Location: incidents.php?status=' . rawurlencode($returnStatus));
exit;