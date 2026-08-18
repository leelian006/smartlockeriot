<?php
require __DIR__ . "/../config.php";
$admin_id = require_admin();

$in = body();
$location_name = trim($in['location_name'] ?? '');
$unlock_hold_seconds = (int)($in['unlock_hold_seconds'] ?? 0);
$notify_hours_before = (int)($in['notify_hours_before'] ?? 0);

if (!$location_name || $unlock_hold_seconds < 1 || $notify_hours_before < 0) {
    json_out(["ok" => false, "error" => "กรุณากรอกข้อมูลให้ถูกต้อง"], 400);
}

$stmt = $pdo->prepare("UPDATE system_settings SET location_name = ?, unlock_hold_seconds = ?, notify_hours_before = ? WHERE id = 1");
$stmt->execute([$location_name, $unlock_hold_seconds, $notify_hours_before]);

json_out(["ok" => true]);
