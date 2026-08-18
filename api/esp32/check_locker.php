<?php
// Called by the ESP32 right after a locker is selected on the keypad,
// before showing the PIN-entry screen. Lets the firmware immediately
// show "overtime, pay online" instead of prompting for a PIN it knows
// won't be accepted.
require __DIR__ . "/../config.php";
require_device();

$locker_id = $_GET['locker_id'] ?? '';
if (!$locker_id) {
    json_out(["ok" => false, "error" => "missing locker_id"], 400);
}

$stmt = $pdo->prepare("
    SELECT status FROM rentals
    WHERE locker_id = ? AND status IN ('awaiting_door','active','expired') AND pin_set = 1
    ORDER BY id DESC LIMIT 1
");
$stmt->execute([$locker_id]);
$rental = $stmt->fetch();

json_out(["ok" => true, "status" => $rental ? $rental['status'] : "none"]);
