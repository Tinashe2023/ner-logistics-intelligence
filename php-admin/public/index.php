<?php
require_once __DIR__ . '/../includes/auth.php';

session_start();
if (!empty($_SESSION['logged_in'])) {
    header('Location: incidents.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if (attempt_login($username, $password)) {
        header('Location: incidents.php');
        exit;
    } else {
        $error = 'Invalid username or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NER Logistics — Dispatcher Login</title>
    <style>
        body { font-family: sans-serif; background: #1a1a2e; color: white;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #16213e; padding: 2rem; border-radius: 8px; width: 300px; }
        input { width: 100%; padding: 0.5rem; margin: 0.4rem 0 1rem 0; box-sizing: border-box; }
        button { width: 100%; padding: 0.6rem; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .error { color: #e74c3c; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Dispatcher Login</h2>
        <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
        <form method="POST">
            <label>Username</label>
            <input type="text" name="username" required>
            <label>Password</label>
            <input type="password" name="password" required>
            <button type="submit">Log In</button>
        </form>
    </div>
</body>
</html>
