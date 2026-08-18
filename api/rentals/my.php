<?php
// Powers the "ตู้ที่กำลังเช่า" page and home preview.
require __DIR__ . "/../config.php";

$user_id = require_user();

$stmt = $pdo->prepare("
    SELECT r.id, r.locker_id, l.location, l.door_closed, r.status, r.pin_set,
           r.duration_minutes, r.price, r.started_at, r.expires_at
    FROM rentals r
    JOIN lockers l ON l.id = r.locker_id
    WHERE r.user_id = ? AND r.status IN ('pending_pin','awaiting_door','active','expired')
    ORDER BY r.created_at DESC
");
$stmt->execute([$user_id]);
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    // PDO returns numeric columns as PHP strings by default (e.g. "0"),
    // and "0" is truthy in JavaScript — cast to real booleans here so
    // the frontend's `if (!l.pin_set)` checks work correctly.
    $row['pin_set'] = (bool)$row['pin_set'];
    $row['door_closed'] = (bool)$row['door_closed'];

    $row['remaining_seconds'] = $row['expires_at']
        ? max(0, strtotime($row['expires_at']) - time())
        : null;
    // Recompute "expired" on read so the countdown that triggered it doesn't need a cron job
    if ($row['remaining_seconds'] === 0 && $row['status'] === 'active') {
        $upd = $pdo->prepare("UPDATE rentals SET status = 'expired' WHERE id = ?");
        $upd->execute([$row['id']]);
        $row['status'] = 'expired';
    }
}

json_out(["ok" => true, "rentals" => $rows]);
