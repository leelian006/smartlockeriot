<?php
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();

$first = trim($in['first_name'] ?? '');
$last = trim($in['last_name'] ?? '');
$phone = trim($in['phone'] ?? '');
$email = trim($in['email'] ?? '');
$new_password = $in['new_password'] ?? '';

if (!$first || !$last || !$phone || !$email) {
    json_out(["ok" => false, "error" => "กรุณากรอกข้อมูลให้ครบ"], 400);
}

$check = $pdo->prepare("SELECT id FROM users WHERE (phone = ? OR email = ?) AND id != ?");
$check->execute([$phone, $email, $user_id]);
if ($check->fetch()) {
    json_out(["ok" => false, "error" => "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้โดยบัญชีอื่นแล้ว"], 409);
}

if ($new_password !== '') {
    if (strlen($new_password) < 6) {
        json_out(["ok" => false, "error" => "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"], 400);
    }
    $hash = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET first_name=?, last_name=?, phone=?, email=?, password_hash=? WHERE id=?");
    $stmt->execute([$first, $last, $phone, $email, $hash, $user_id]);
} else {
    $stmt = $pdo->prepare("UPDATE users SET first_name=?, last_name=?, phone=?, email=? WHERE id=?");
    $stmt->execute([$first, $last, $phone, $email, $user_id]);
}

json_out(["ok" => true]);
