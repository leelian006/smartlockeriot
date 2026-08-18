<?php
// Step 1-2 of the rent flow: user picked a locker + duration.
// Creates a rental row in 'pending_payment' status — nothing is
// charged or unlocked yet, this just reserves the intent.
require __DIR__ . "/../config.php";

$user_id = require_user();
$in = body();
$locker_id = $in['locker_id'] ?? '';
$duration_minutes = (int)($in['duration_minutes'] ?? 0);
$price = (float)($in['price'] ?? 0);

$valid = [10 => 10, 30 => 20, 60 => 30]; // duration_minutes => price, matches web pricing
if (!isset($valid[$duration_minutes]) || $valid[$duration_minutes] != $price) {
    json_out(["ok" => false, "error" => "ระยะเวลา/ราคาไม่ถูกต้อง"], 400);
}

$pdo->beginTransaction();
try {
    $lockStmt = $pdo->prepare("SELECT state FROM lockers WHERE id = ? FOR UPDATE");
    $lockStmt->execute([$locker_id]);
    $locker = $lockStmt->fetch();
    if (!$locker) { throw new Exception("ไม่พบตู้นี้"); }
    if ($locker['state'] !== 'available') { throw new Exception("ตู้นี้ไม่ว่าง"); }

    $stmt = $pdo->prepare("INSERT INTO rentals (locker_id, user_id, status, duration_minutes, price) VALUES (?, ?, 'pending_payment', ?, ?)");
    $stmt->execute([$locker_id, $user_id, $duration_minutes, $price]);
    $rental_id = $pdo->lastInsertId();

    $pdo->commit();
    json_out(["ok" => true, "rental_id" => $rental_id]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_out(["ok" => false, "error" => $e->getMessage()], 409);
}
