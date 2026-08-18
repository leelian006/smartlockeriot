<?php
// Admin-side only. Kept separate from send.php (not auto-detected via
// session) specifically so that being logged in as both a user and an
// admin in the same browser tab group can never mix up which role a
// message is sent as — this endpoint always requires an admin session.
require __DIR__ . "/../config.php";
require_admin();

$in = body();
$message = trim($in['message'] ?? '');
$target_user_id = (int)($in['user_id'] ?? 0);

if (!$message) {
    json_out(["ok" => false, "error" => "ข้อความว่างเปล่า"], 400);
}
if (!$target_user_id) {
    json_out(["ok" => false, "error" => "กรุณาเลือกบทสนทนาก่อน"], 400);
}

$stmt = $pdo->prepare("INSERT INTO chat_messages (user_id, sender, message) VALUES (?, 'admin', ?)");
$stmt->execute([$target_user_id, $message]);

json_out(["ok" => true]);
