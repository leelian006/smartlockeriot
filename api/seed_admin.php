<?php
// Run this ONCE (open in browser, e.g. http://localhost/smart-locker-backend/api/seed_admin.php)
// to create a default admin login, then delete this file.
require __DIR__ . "/config.php";

$username = "admin";
$password = "admin1234";   // change this after first login

$check = $pdo->prepare("SELECT id FROM admins WHERE username = ?");
$check->execute([$username]);
if ($check->fetch()) {
    json_out(["ok" => false, "error" => "Admin account already exists"]);
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO admins (name, username, password_hash) VALUES (?, ?, ?)");
$stmt->execute(["พีรพล จันทร์", $username, $hash]);

json_out(["ok" => true, "message" => "Created admin login — username: $username / password: $password. Delete this file now."]);
