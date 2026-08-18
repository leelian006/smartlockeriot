<?php
require __DIR__ . "/../config.php";
$admin_id = require_admin();

$in = body();
$payment_id = (int)($in['payment_id'] ?? 0);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("
        SELECT p.*, r.locker_id, r.status AS rental_status, r.expires_at, u.first_name, u.last_name
        FROM payments p
        JOIN rentals r ON r.id = p.rental_id
        JOIN users u ON u.id = r.user_id
        WHERE p.id = ? AND p.status = 'pending' FOR UPDATE
    ");
    $stmt->execute([$payment_id]);
    $p = $stmt->fetch();
    if (!$p) { throw new Exception("ไม่พบรายการนี้ หรือถูกดำเนินการไปแล้ว"); }

    $pdo->prepare("UPDATE payments SET status = 'confirmed', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?")
        ->execute([$admin_id, $payment_id]);

    if ($p['kind'] === 'new') {
        // NOTE: expires_at is intentionally left NULL here — the rental
        // countdown only starts once the user sets their PIN (see
        // api/rentals/set_pin.php), not at the moment payment is confirmed.
        $pdo->prepare("UPDATE rentals SET status = 'pending_pin' WHERE id = ?")
            ->execute([$p['rental_id']]);
        $pdo->prepare("UPDATE lockers SET state = 'occupied' WHERE id = ?")->execute([$p['locker_id']]);
        $note = "ผู้ใช้ต้องตั้งรหัสผ่าน 4 หลักก่อนใช้งานตู้ — เวลาเช่าจะเริ่มนับหลังตั้งรหัสเสร็จ";
    } elseif ($p['kind'] === 'penalty') {
        // Overtime penalty paid and approved — this is the retrieval
        // step: rental ends here and the locker frees up immediately,
        // same as a successful PIN retrieval.
        $pdo->prepare("UPDATE rentals SET status = 'completed' WHERE id = ?")->execute([$p['rental_id']]);
        $pdo->prepare("UPDATE lockers SET state = 'available' WHERE id = ?")->execute([$p['locker_id']]);
        $note = "ชำระค่าปรับสำเร็จ ปลดล็อกให้นำของออกแล้ว";
    } else {
        $base = max(strtotime($p['expires_at'] ?? 'now'), time());
        $newExpiresAt = date("Y-m-d H:i:s", $base + $p['duration_minutes'] * 60);
        $pdo->prepare("UPDATE rentals SET expires_at = ?, status = 'active' WHERE id = ?")
            ->execute([$newExpiresAt, $p['rental_id']]);
        $note = "ต่อเวลาให้อีก " . $p['duration_minutes'] . " นาที";
    }

    // ESP32 polls unlock_commands for this locker — see api/esp32/poll.php
    $pdo->prepare("INSERT INTO unlock_commands (locker_id, reason) VALUES (?, 'admin_confirm')")
        ->execute([$p['locker_id']]);

    log_activity($pdo, $p['locker_id'], $p['first_name'] . " " . $p['last_name'], "ชำระเงินสำเร็จ (" . $p['kind'] . ") — " . $note);

    $pdo->commit();
    json_out(["ok" => true, "message" => $note]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_out(["ok" => false, "error" => $e->getMessage()], 409);
}
