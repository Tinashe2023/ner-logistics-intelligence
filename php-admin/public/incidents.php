<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/db.php';
require_login();

$db = get_db();
$statusFilter = $_GET['status'] ?? 'pending';
$allowedStatuses = ['pending', 'approved', 'rejected', 'all'];
if (!in_array($statusFilter, $allowedStatuses, true)) {
    $statusFilter = 'pending';
}

if ($statusFilter === 'all') {
    $stmt = $db->query('SELECT * FROM incidents ORDER BY reported_at DESC');
} else {
    $stmt = $db->prepare('SELECT * FROM incidents WHERE status = :status ORDER BY reported_at DESC');
    $stmt->execute(['status' => $statusFilter]);
}
$incidents = $stmt->fetchAll();

$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NER Logistics — Incident Review</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f8; margin: 0; }
        header { background: #1a1a2e; color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        header a { color: #ccc; text-decoration: none; font-size: 0.85rem; }
        main { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        th { background: #eef1f5; }
        .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; color: white; }
        .badge-pending { background: #f39c12; }
        .badge-approved { background: #27ae60; }
        .badge-rejected { background: #c0392b; }
        .filters a { margin-right: 1rem; text-decoration: none; color: #2980b9; }
        .filters a.active { font-weight: bold; text-decoration: underline; }
        button { padding: 0.3rem 0.7rem; border: none; border-radius: 4px; cursor: pointer; color: white; font-size: 0.8rem; }
        .btn-approve { background: #27ae60; }
        .btn-reject { background: #c0392b; }
        .flash { padding: 0.6rem 1rem; background: #d4edda; color: #155724; margin-bottom: 1rem; border-radius: 4px; }
    </style>
</head>
<body>
    <header>
        <strong>NER Logistics — Incident Review</strong>
        <span>
            <?= htmlspecialchars($_SESSION['username'] ?? '') ?> |
            <a href="logout.php">Log out</a>
        </span>
    </header>
    <main>
        <?php if ($flash): ?><div class="flash"><?= htmlspecialchars($flash) ?></div><?php endif; ?>

        <div class="filters">
            <a href="?status=pending" class="<?= $statusFilter === 'pending' ? 'active' : '' ?>">Pending</a>
            <a href="?status=approved" class="<?= $statusFilter === 'approved' ? 'active' : '' ?>">Approved</a>
            <a href="?status=rejected" class="<?= $statusFilter === 'rejected' ? 'active' : '' ?>">Rejected</a>
            <a href="?status=all" class="<?= $statusFilter === 'all' ? 'active' : '' ?>">All</a>
        </div>

        <table>
            <thead>
                <tr>
                    <th>ID</th><th>Type</th><th>Severity</th><th>Location</th>
                    <th>Description</th><th>Reported</th><th>Status</th><th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($incidents as $inc): ?>
                <tr>
                    <td>#<?= (int)$inc['id'] ?></td>
                    <td><?= htmlspecialchars($inc['type']) ?></td>
                    <td><?= htmlspecialchars($inc['severity']) ?></td>
                    <td><?= number_format((float)$inc['lat'], 4) ?>, <?= number_format((float)$inc['lon'], 4) ?></td>
                    <td><?= htmlspecialchars($inc['description'] ?? '') ?></td>
                    <td><?= htmlspecialchars($inc['reported_at']) ?></td>
                    <td><span class="badge badge-<?= htmlspecialchars($inc['status']) ?>"><?= htmlspecialchars($inc['status']) ?></span></td>
                    <td>
                        <?php if ($inc['status'] === 'pending'): ?>
                            <form method="POST" action="actions.php" style="display:inline">
                                <input type="hidden" name="id" value="<?= (int)$inc['id'] ?>">
                                <input type="hidden" name="action" value="approve">
                                <button type="submit" class="btn-approve">Approve</button>
                            </form>
                            <form method="POST" action="actions.php" style="display:inline">
                                <input type="hidden" name="id" value="<?= (int)$inc['id'] ?>">
                                <input type="hidden" name="action" value="reject">
                                <button type="submit" class="btn-reject">Reject</button>
                            </form>
                        <?php else: ?>
                            —
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php if (empty($incidents)): ?>
                <tr><td colspan="8" style="text-align:center; color:#888;">No incidents in this view.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </main>
</body>
</html>
