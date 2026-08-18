<?php
// Only the location/description text is editable here — deliberately
// NOT the state (available/occupied), since that's derived from real
// rentals and hand-editing it would desync the database from reality.
require __DIR__ . "/../config.php";
$admin_id = require_admin();

$in = body();
$locker_id = $in['locker_id'] ?? '';
$location = trim($in['location'] ?? '');

if (!$locker_id || !$location) {
    json_out(["ok" => false, "error" => "กรุณากรอกชื่อสถานที่"], 400);
}

$stmt = $pdo->prepare("UPDATE lockers SET location = ? WHERE id = ?");
$stmt->execute([$location, $locker_id]);

log_activity($pdo, $locker_id, "แอดมิน", "แก้ไขข้อมูลตู้: " . $location);

json_out(["ok" => true]);
