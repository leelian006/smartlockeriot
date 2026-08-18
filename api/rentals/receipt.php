<?php
require __DIR__ . "/../config.php";
$user_id = require_user();

$rental_id = (int)($_GET['rental_id'] ?? 0);

$stmt = $pdo->prepare("
    SELECT p.ref_code, p.amount, p.duration_minutes, p.created_at, r.locker_id
    FROM payments p
    JOIN rentals r ON r.id = p.rental_id
    WHERE p.rental_id = ? AND p.kind = 'new' AND p.status = 'confirmed' AND r.user_id = ?
    ORDER BY p.id DESC LIMIT 1
");
$stmt->execute([$rental_id, $user_id]);
$row = $stmt->fetch();

if (!$row) {
    json_out(["ok" => false, "error" => "ไม่พบข้อมูลใบเสร็จ"], 404);
}
json_out(["ok" => true, "receipt" => $row]);
