<?php
require __DIR__ . "/../config.php";
$admin_id = require_admin();

$in = body();
$locker_ids = $in['locker_ids'] ?? [];
$reason = trim($in['reason'] ?? '');

if (!is_array($locker_ids) || count($locker_ids) === 0 || !$reason) {
    json_out(["ok" => false, "error" => "กรุณาเลือกตู้อย่างน้อย 1 ตู้ และระบุเหตุผล"], 400);
}

$stmt = $pdo->prepare("INSERT INTO unlock_commands (locker_id, reason) VALUES (?, 'emergency')");
foreach ($locker_ids as $id) {
    $stmt->execute([$id]);
    log_activity($pdo, $id, "ระบบ (แอดมิน)", "ปลดล็อกฉุกเฉิน: " . $reason);
}

json_out(["ok" => true]);
