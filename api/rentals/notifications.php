<?php
// Powers the red "notice-card" banners on the user's home page.
require __DIR__ . "/../config.php";
$user_id = require_user();

$stmt = $pdo->prepare("
    SELECT p.id, p.ref_code, p.kind, p.reject_reason, r.locker_id, p.reviewed_at
    FROM payments p
    JOIN rentals r ON r.id = p.rental_id
    WHERE r.user_id = ? AND p.status = 'rejected'
    ORDER BY p.reviewed_at DESC
    LIMIT 10
");
$stmt->execute([$user_id]);
json_out(["ok" => true, "notifications" => $stmt->fetchAll()]);
