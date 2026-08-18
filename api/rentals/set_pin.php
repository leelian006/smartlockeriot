<?php
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$rental_id = (int)($in['rental_id'] ?? 0);
$pin = $in['pin'] ?? '';

if (!preg_match('/^\d{4}$/', $pin)) {
    json_out(["ok" => false, "error" => "รหัสผ่านต้องเป็นตัวเลข 4 หลัก"], 400);
}

$stmt = $pdo->prepare("SELECT * FROM rentals WHERE id = ? AND user_id = ? AND status = 'pending_pin'");
$stmt->execute([$rental_id, $user_id]);
$rental = $stmt->fetch();
if (!$rental) {
    json_out(["ok" => false, "error" => "ไม่พบรายการเช่านี้ หรือยังไม่พร้อมตั้งรหัสผ่าน"], 404);
}

$hash = password_hash($pin, PASSWORD_BCRYPT);
// NOTE: expires_at/started_at intentionally NOT set here anymore — the
// countdown only starts once the MC-38 sensor confirms the door is
// actually closed (see api/esp32/door_status.php).
$upd = $pdo->prepare("UPDATE rentals SET pin_hash = ?, pin_set = 1, status = 'awaiting_door' WHERE id = ?");
$upd->execute([$hash, $rental_id]);

json_out(["ok" => true]);
