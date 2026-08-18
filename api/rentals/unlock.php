<?php
// SUPERSEDED: the web "ปลดล็อก" button now calls verify_and_unlock.php
// instead (requires PIN entry, matching the physical keypad retrieval
// flow). This file is left in place but no longer called from the
// frontend — kept in case a no-PIN unlock is wanted elsewhere later.
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$rental_id = (int)($in['rental_id'] ?? 0);

$stmt = $pdo->prepare("
    SELECT r.locker_id, u.first_name, u.last_name FROM rentals r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.user_id = ? AND r.status IN ('pending_pin','awaiting_door','active','expired')
");
$stmt->execute([$rental_id, $user_id]);
$rental = $stmt->fetch();

if (!$rental) {
    json_out(["ok" => false, "error" => "ไม่พบตู้ที่เช่านี้"], 404);
}

$pdo->prepare("INSERT INTO unlock_commands (locker_id, reason) VALUES (?, 'user_unlock')")
    ->execute([$rental['locker_id']]);

log_activity($pdo, $rental['locker_id'], $rental['first_name'] . " " . $rental['last_name'], "ปลดล็อกผ่านเว็บ");

json_out(["ok" => true]);
