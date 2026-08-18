<?php
require __DIR__ . "/../config.php";

$in = body();
$first = trim($in['first_name'] ?? '');
$last  = trim($in['last_name'] ?? '');
$phone = trim($in['phone'] ?? '');
$email = trim($in['email'] ?? '');
$pass  = $in['password'] ?? '';

if (!$first || !$last || !$phone || !$email || strlen($pass) < 6) {
    json_out(["ok" => false, "error" => "กรุณากรอกข้อมูลให้ครบ และรหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"], 400);
}

$check = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR email = ?");
$check->execute([$phone, $email]);
if ($check->fetch()) {
    json_out(["ok" => false, "error" => "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้ไปแล้ว"], 409);
}

$hash = password_hash($pass, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)");
$stmt->execute([$first, $last, $phone, $email, $hash]);

json_out(["ok" => true, "message" => "สมัครสมาชิกสำเร็จ"]);
