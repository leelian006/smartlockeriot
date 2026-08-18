<?php
require __DIR__ . "/../config.php";

$in = body();
$identifier = trim($in['identifier'] ?? '');  // phone or email
$pass = $in['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? OR email = ?");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'])) {
    json_out(["ok" => false, "error" => "เบอร์โทร/อีเมล หรือรหัสผ่านไม่ถูกต้อง"], 401);
}

$_SESSION['user_id'] = $user['id'];
json_out([
    "ok" => true,
    "user" => [
        "id" => $user['id'],
        "name" => $user['first_name'] . " " . $user['last_name'],
        "phone" => $user['phone'],
        "email" => $user['email']
    ]
]);
