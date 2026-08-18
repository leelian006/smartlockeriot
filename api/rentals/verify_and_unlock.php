<?php
// The web "ปลดล็อก" button now goes through the same retrieval flow as
// the physical keypad: PIN required, correct PIN completes the rental
// and frees the locker; wrong PIN never unlocks (and counts toward
// the same brute-force lockout as the keypad, since it's the same PIN).
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$rental_id = (int)($in['rental_id'] ?? 0);
$pin = $in['pin'] ?? '';

if (!preg_match('/^\d{4}$/', $pin)) {
    json_out(["ok" => false, "error" => "รหัสผ่านต้องเป็นตัวเลข 4 หลัก"], 400);
}

$stmt = $pdo->prepare("
    SELECT r.*, u.first_name, u.last_name FROM rentals r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.user_id = ? AND r.status IN ('awaiting_door','active','expired') AND r.pin_set = 1
");
$stmt->execute([$rental_id, $user_id]);
$rental = $stmt->fetch();

if (!$rental) {
    json_out(["ok" => false, "error" => "ไม่พบตู้ที่เช่านี้ หรือยังไม่พร้อมปลดล็อก"], 404);
}

if ($rental['status'] === 'expired') {
    json_out(["ok" => false, "error" => "ตู้นี้เกินเวลาที่กำหนดแล้ว กรุณาชำระค่าปรับก่อนนำของออก"], 400);
}

if ($rental['pin_locked_until'] && strtotime($rental['pin_locked_until']) > time()) {
    $waitSec = strtotime($rental['pin_locked_until']) - time();
    json_out(["ok" => false, "error" => "กรอกรหัสผิดหลายครั้ง กรุณารออีก $waitSec วินาที"], 423);
}

if (!password_verify($pin, $rental['pin_hash'])) {
    $fails = $rental['pin_fail_count'] + 1;
    $lockedUntil = null;
    if ($fails >= 5) {
        $lockedUntil = date("Y-m-d H:i:s", time() + 5 * 60);
        $fails = 0;
    }
    $pdo->prepare("UPDATE rentals SET pin_fail_count = ?, pin_locked_until = ? WHERE id = ?")
        ->execute([$fails, $lockedUntil, $rental_id]);
    json_out(["ok" => true, "unlock" => false, "error" => "รหัสผ่านไม่ถูกต้อง"], 200);
}

// Correct — same as the physical keypad: this is the retrieval step,
// so the rental ends here and the locker frees up immediately.
$pdo->prepare("UPDATE rentals SET pin_fail_count = 0, pin_locked_until = NULL, status = 'completed' WHERE id = ?")
    ->execute([$rental_id]);
$pdo->prepare("UPDATE lockers SET state = 'available' WHERE id = ?")->execute([$rental['locker_id']]);

$pdo->prepare("INSERT INTO unlock_commands (locker_id, reason) VALUES (?, 'user_unlock')")
    ->execute([$rental['locker_id']]);

log_activity($pdo, $rental['locker_id'], $rental['first_name'] . " " . $rental['last_name'], "นำของออกสำเร็จผ่านเว็บ — ตู้ว่างพร้อมใช้งาน");

json_out(["ok" => true, "unlock" => true]);
