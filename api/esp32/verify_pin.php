<?php
// Called by the ESP32 every time someone types 4 digits on the
// Keypad 4x4 to retrieve their item. Locks out after 5 wrong
// attempts for 5 minutes to prevent brute-forcing a 4-digit PIN
// (only 10,000 possible codes).
require __DIR__ . "/../config.php";
require_device();

$in = body();
$locker_id = $in['locker_id'] ?? '';
$pin = $in['pin'] ?? '';

$stmt = $pdo->prepare("
    SELECT * FROM rentals
    WHERE locker_id = ? AND status IN ('awaiting_door','active','expired') AND pin_set = 1
    ORDER BY id DESC LIMIT 1
");
$stmt->execute([$locker_id]);
$rental = $stmt->fetch();

if (!$rental) {
    json_out(["ok" => false, "unlock" => false, "error" => "ตู้นี้ไม่มีการเช่าที่ใช้งานอยู่"], 404);
}

if ($rental['status'] === 'expired') {
    json_out(["ok" => false, "unlock" => false, "overtime" => true,
        "error" => "ตู้ของคุณเกินเวลาที่กำหนด กรุณาชำระค่าปรับผ่านเว็บไซต์"], 200);
}

if ($rental['pin_locked_until'] && strtotime($rental['pin_locked_until']) > time()) {
    $waitSec = strtotime($rental['pin_locked_until']) - time();
    json_out(["ok" => false, "unlock" => false, "error" => "กรอกรหัสผิดหลายครั้ง กรุณารออีก $waitSec วินาที"], 423);
}

if (!password_verify($pin, $rental['pin_hash'])) {
    $fails = $rental['pin_fail_count'] + 1;
    $lockedUntil = null;
    if ($fails >= 5) {
        $lockedUntil = date("Y-m-d H:i:s", time() + 5 * 60);
        $fails = 0;
    }
    $pdo->prepare("UPDATE rentals SET pin_fail_count = ?, pin_locked_until = ? WHERE id = ?")
        ->execute([$fails, $lockedUntil, $rental['id']]);
    json_out(["ok" => true, "unlock" => false, "error" => "รหัสผ่านไม่ถูกต้อง"], 200);
}

// Correct PIN — this is the retrieval step: the customer is taking
// their item out for good, so the rental ends here and the locker
// frees up immediately for the next customer (rather than staying
// "occupied" until the timer naturally runs out).
$pdo->prepare("UPDATE rentals SET pin_fail_count = 0, pin_locked_until = NULL, status = 'completed' WHERE id = ?")
    ->execute([$rental['id']]);
$pdo->prepare("UPDATE lockers SET state = 'available' WHERE id = ?")->execute([$locker_id]);

log_activity($pdo, $locker_id, "ระบบ (Keypad)", "นำของออกสำเร็จ — ตู้ว่างพร้อมใช้งาน");

json_out(["ok" => true, "unlock" => true]);
