<?php
// User-side only. If you're also logged in as admin in the same
// browser (shared session cookie across tabs), this endpoint must
// NOT guess the role from session state — it always sends as the
// logged-in customer. Admin replies go through admin_send.php instead.
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$message = trim($in['message'] ?? '');
if (!$message) {
    json_out(["ok" => false, "error" => "ข้อความว่างเปล่า"], 400);
}

$stmt = $pdo->prepare("INSERT INTO chat_messages (user_id, sender, message) VALUES (?, 'user', ?)");
$stmt->execute([$user_id, $message]);

json_out(["ok" => true]);
