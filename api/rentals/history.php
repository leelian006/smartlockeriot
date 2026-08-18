<?php
require __DIR__ . "/../config.php";

$user_id = require_user();

$stmt = $pdo->prepare("
    SELECT r.locker_id, r.duration_minutes, p.amount, r.status, r.created_at
    FROM rentals r
    JOIN payments p ON p.rental_id = r.id AND p.status = 'confirmed' AND p.kind = 'new'
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$user_id]);
json_out(["ok" => true, "history" => $stmt->fetchAll()]);
