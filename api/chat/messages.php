<?php
// User-side only. See send.php for why role auto-detection from
// session state is unsafe when someone is logged in as both a user
// and an admin in the same browser — admin conversation viewing goes
// through admin_messages.php instead.
require __DIR__ . "/../config.php";

$user_id = require_user();

$stmt = $pdo->prepare("SELECT sender, message, created_at FROM chat_messages WHERE user_id = ? ORDER BY id ASC");
$stmt->execute([$user_id]);
$messages = $stmt->fetchAll();

// Mark the admin's messages as read now that the customer opened the thread
$pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender = 'admin'")
    ->execute([$user_id]);

json_out(["ok" => true, "messages" => $messages]);
