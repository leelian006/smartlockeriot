<?php
require __DIR__ . "/../config.php";
require_admin();

$stmt = $pdo->query("
    SELECT p.id, p.ref_code, p.kind, p.amount, p.duration_minutes, p.slip_path, p.created_at,
           r.locker_id, u.first_name, u.last_name
    FROM payments p
    JOIN rentals r ON r.id = p.rental_id
    JOIN users u ON u.id = r.user_id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC
");
json_out(["ok" => true, "pending" => $stmt->fetchAll()]);
