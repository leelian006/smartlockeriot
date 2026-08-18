<?php
require __DIR__ . "/../config.php";
require_admin();

$total = (int)$pdo->query("SELECT COUNT(*) c FROM lockers")->fetch()['c'];
$available = (int)$pdo->query("SELECT COUNT(*) c FROM lockers WHERE state = 'available'")->fetch()['c'];
$occupied = (int)$pdo->query("SELECT COUNT(*) c FROM lockers WHERE state = 'occupied'")->fetch()['c'];
$doorAlerts = (int)$pdo->query("SELECT COUNT(*) c FROM lockers WHERE door_closed = 0")->fetch()['c'];

$activity = $pdo->query("SELECT locker_id, actor, action, created_at FROM activity_log ORDER BY id DESC LIMIT 15")->fetchAll();

json_out([
    "ok" => true,
    "stats" => ["total" => $total, "available" => $available, "occupied" => $occupied, "door_alerts" => $doorAlerts],
    "activity" => $activity
]);
