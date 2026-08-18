<?php
require __DIR__ . "/../config.php";
require_admin();

$stmt = $pdo->query("
    SELECT u.id, u.first_name, u.last_name, u.phone,
           (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id) AS rental_count,
           (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id AND r.status IN ('active','pending_pin','awaiting_door','expired')) AS active_count
    FROM users u
    ORDER BY u.created_at DESC
");
json_out(["ok" => true, "users" => $stmt->fetchAll()]);
