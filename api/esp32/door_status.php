<?php
// ESP32 calls this whenever the MC-38 reed switch changes state
// (or on a heartbeat interval) so the admin dashboard shows live
// door status and can flag possible tampering.
//
// It also drives the "timer starts when the door actually closes"
// rule: if a locker has a rental sitting in 'awaiting_door' (PIN just
// set, waiting to be shut) and this call reports the door as closed,
// the countdown starts right here.
require __DIR__ . "/../config.php";
require_device();

$in = body();
$locker_id = $in['locker_id'] ?? '';
$door_closed = !empty($in['door_closed']) ? 1 : 0;

$stmt = $pdo->prepare("UPDATE lockers SET door_closed = ? WHERE id = ?");
$stmt->execute([$door_closed, $locker_id]);

$rentalStmt = $pdo->prepare("
    SELECT r.id, r.duration_minutes, u.first_name, u.last_name
    FROM rentals r
    JOIN users u ON u.id = r.user_id
    WHERE r.locker_id = ? AND r.status = 'awaiting_door'
    ORDER BY r.id DESC LIMIT 1
");
$rentalStmt->execute([$locker_id]);
$awaitingRental = $rentalStmt->fetch();

if ($awaitingRental) {
    if ($door_closed) {
        $expiresAt = date("Y-m-d H:i:s", time() + $awaitingRental['duration_minutes'] * 60);
        $pdo->prepare("UPDATE rentals SET status = 'active', started_at = NOW(), expires_at = ? WHERE id = ?")
            ->execute([$expiresAt, $awaitingRental['id']]);
        log_activity($pdo, $locker_id, $awaitingRental['first_name'] . " " . $awaitingRental['last_name'], "ปิดประตูสนิท — เริ่มนับเวลาเช่าแล้ว");
    } else {
        log_activity($pdo, $locker_id, "ระบบ (MC-38)", "รอปิดประตูเพื่อเริ่มนับเวลา — ประตูยังไม่ปิดสนิท");
    }
} elseif (!$door_closed) {
    log_activity($pdo, $locker_id, "ระบบ (MC-38)", "ตรวจพบการเปิดประตูผิดปกติ");
}

json_out(["ok" => true]);
