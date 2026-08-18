<?php
require __DIR__ . "/../config.php";

$in = body();
$username = trim($in['username'] ?? '');
$pass = $in['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
$stmt->execute([$username]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($pass, $admin['password_hash'])) {
    json_out(["ok" => false, "error" => "รหัสพนักงาน/อีเมล หรือรหัสผ่านไม่ถูกต้อง"], 401);
}

$_SESSION['admin_id'] = $admin['id'];
json_out(["ok" => true, "admin" => ["id" => $admin['id'], "name" => $admin['name']]]);
