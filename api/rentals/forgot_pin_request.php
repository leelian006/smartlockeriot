<?php
// Step 1 of "ลืมรหัสผ่านตู้": generates a 6-digit OTP.
// NOTE: this does not send an SMS yet — wire up a Thai SMS gateway
// here before going live. For local testing, look up the code
// directly in the pin_reset_otps table.
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$rental_id = (int)($in['rental_id'] ?? 0);

$stmt = $pdo->prepare("SELECT id FROM rentals WHERE id = ? AND user_id = ? AND pin_set = 1");
$stmt->execute([$rental_id, $user_id]);
if (!$stmt->fetch()) {
    json_out(["ok" => false, "error" => "ไม่พบตู้ที่เช่านี้"], 404);
}

$otp = str_pad((string)random_int(0, 999999), 6, "0", STR_PAD_LEFT);
$expires = date("Y-m-d H:i:s", time() + 5 * 60);

$ins = $pdo->prepare("INSERT INTO pin_reset_otps (rental_id, otp_code, expires_at) VALUES (?, ?, ?)");
$ins->execute([$rental_id, $otp, $expires]);

// TODO: send $otp via SMS to the user's registered phone number instead of returning it.
json_out(["ok" => true, "message" => "ส่งรหัสยืนยันไปยังเบอร์โทรศัพท์ที่ลงทะเบียนแล้ว"]);
