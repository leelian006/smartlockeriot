<?php
// Powers an admin "conversation list" (one row per customer) if you
// build that UI out further — the current prototype only shows a
// single fixed thread, but this scales to real multi-customer chat.
require __DIR__ . "/../config.php";
require_admin();

$stmt = $pdo->query("
    SELECT u.id AS user_id, u.first_name, u.last_name,
           (SELECT message FROM chat_messages m WHERE m.user_id = u.id ORDER BY m.id DESC LIMIT 1) AS last_message,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.user_id = u.id AND m.sender = 'user' AND m.is_read = 0) AS unread_count
    FROM users u
    WHERE EXISTS (SELECT 1 FROM chat_messages m WHERE m.user_id = u.id)
    ORDER BY (SELECT MAX(id) FROM chat_messages m WHERE m.user_id = u.id) DESC
");
json_out(["ok" => true, "conversations" => $stmt->fetchAll()]);
