<?php
// Handles the "แนบสลิปการโอนเงิน" step for a brand-new rental
// (kind=new), a time extension (kind=extend), or an overtime penalty
// payment (kind=penalty). multipart/form-data — NOT JSON — because it
// carries a file.
require __DIR__ . "/../config.php";

$user_id = require_user();

const PENALTY_AMOUNT = 100;

$rental_id = (int)($_POST['rental_id'] ?? 0);
$kindRaw = $_POST['kind'] ?? 'new';
$kind = in_array($kindRaw, ['new', 'extend', 'penalty']) ? $kindRaw : 'new';

if ($kind === 'penalty') {
    $duration_minutes = 0;
    $price = PENALTY_AMOUNT;
} else {
    $duration_minutes = (int)($_POST['duration_minutes'] ?? 0);
    $price = (float)($_POST['price'] ?? 0);
    $valid = [10 => 10, 30 => 20, 60 => 30];
    if (!isset($valid[$duration_minutes]) || $valid[$duration_minutes] != $price) {
        json_out(["ok" => false, "error" => "ระยะเวลา/ราคาไม่ถูกต้อง"], 400);
    }
}

$stmt = $pdo->prepare("SELECT * FROM rentals WHERE id = ? AND user_id = ?");
$stmt->execute([$rental_id, $user_id]);
$rental = $stmt->fetch();
if (!$rental) {
    json_out(["ok" => false, "error" => "ไม่พบรายการเช่านี้"], 404);
}
if ($kind === 'penalty' && $rental['status'] !== 'expired') {
    json_out(["ok" => false, "error" => "ตู้นี้ยังไม่เกินเวลาที่กำหนด"], 400);
}

if (empty($_FILES['slip']) || $_FILES['slip']['error'] !== UPLOAD_ERR_OK) {
    json_out(["ok" => false, "error" => "กรุณาแนบไฟล์สลิป"], 400);
}

$ext = strtolower(pathinfo($_FILES['slip']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
    json_out(["ok" => false, "error" => "รองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp)"], 400);
}

$filename = "slip_" . $rental_id . "_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $ext;
$destDir = __DIR__ . "/../../uploads/slips/";
$dest = $destDir . $filename;

if (!move_uploaded_file($_FILES['slip']['tmp_name'], $dest)) {
    json_out(["ok" => false, "error" => "อัปโหลดไฟล์ไม่สำเร็จ"], 500);
}

$ref = ref_code();
$ins = $pdo->prepare("
    INSERT INTO payments (rental_id, kind, ref_code, amount, duration_minutes, slip_path, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
");
$ins->execute([$rental_id, $kind, $ref, $price, $duration_minutes, "uploads/slips/" . $filename]);

// TODO: send a LINE Notify message to the admin group here with the
// slip image + ref code, so staff don't have to keep the queue open.

json_out(["ok" => true, "ref_code" => $ref]);
