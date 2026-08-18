<?php
// ESP32 calls this every 3-5 seconds per locker (see README) to check
// whether it should fire the relay/solenoid. Simpler than WebSocket/MQTT
// for a one-week deadline, at the cost of a few seconds of latency.
require __DIR__ . "/../config.php";
require_device();

$locker_id = $_GET['locker_id'] ?? '';
if (!$locker_id) {
    json_out(["ok" => false, "error" => "missing locker_id"], 400);
}

$stmt = $pdo->prepare("
    SELECT id, reason FROM unlock_commands
    WHERE locker_id = ? AND consumed = 0
    ORDER BY id ASC LIMIT 1
");
$stmt->execute([$locker_id]);
$cmd = $stmt->fetch();

if (!$cmd) {
    json_out(["ok" => true, "unlock" => false]);
}

$pdo->prepare("UPDATE unlock_commands SET consumed = 1 WHERE id = ?")->execute([$cmd['id']]);
json_out(["ok" => true, "unlock" => true, "reason" => $cmd['reason']]);
