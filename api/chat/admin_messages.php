<?php
// Admin-side only. See messages.php for why this is a separate
// endpoint rather than one that guesses the role from session state.
require __DIR__ . "/../config.php";
require_admin();

$user_id = (int)($_GET['user_id'] ?? 0);
if (!$user_id) {
    json_out(["ok" => false, "error" => "missing user_id"], 400);
}

$stmt = $pdo->prepare("SELECT sender, message, created_at FROM chat_messages WHERE user_id = ? ORDER BY id ASC");
$stmt->execute([$user_id]);
$messages = $stmt->fetchAll();

// Mark the customer's messages as read now that the admin opened this thread
$pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender = 'user'")
    ->execute([$user_id]);

json_out(["ok" => true, "messages" => $messages]);
