<?php
// Step 2 of "ลืมรหัสผ่านตู้": verify the OTP, then set a new PIN.
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$rental_id = (int)($in['rental_id'] ?? 0);
$otp = trim($in['otp'] ?? '');
$new_pin = $in['new_pin'] ?? '';

if (!preg_match('/^\d{4}$/', $new_pin)) {
    json_out(["ok" => false, "error" => "รหัสผ่านใหม่ต้องเป็นตัวเลข 4 หลัก"], 400);
}

$stmt = $pdo->prepare("
    SELECT o.id FROM pin_reset_otps o
    JOIN rentals r ON r.id = o.rental_id
    WHERE o.rental_id = ? AND o.otp_code = ? AND o.used = 0 AND o.expires_at > NOW() AND r.user_id = ?
    ORDER BY o.id DESC LIMIT 1
");
$stmt->execute([$rental_id, $otp, $user_id]);
$row = $stmt->fetch();

if (!$row) {
    json_out(["ok" => false, "error" => "รหัสยืนยันไม่ถูกต้องหรือหมดอายุ"], 400);
}

$pdo->prepare("UPDATE pin_reset_otps SET used = 1 WHERE id = ?")->execute([$row['id']]);

$hash = password_hash($new_pin, PASSWORD_BCRYPT);
$pdo->prepare("UPDATE rentals SET pin_hash = ?, pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?")
    ->execute([$hash, $rental_id]);

json_out(["ok" => true]);
