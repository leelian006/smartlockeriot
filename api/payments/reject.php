<?php
require __DIR__ . "/../config.php";
$admin_id = require_admin();

$in = body();
$payment_id = (int)($in['payment_id'] ?? 0);
$reason = trim($in['reason'] ?? '');

if (!$reason) {
    json_out(["ok" => false, "error" => "กรุณาระบุเหตุผลก่อนปฏิเสธสลิป"], 400);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("
        SELECT p.*, r.locker_id FROM payments p
        JOIN rentals r ON r.id = p.rental_id
        WHERE p.id = ? AND p.status = 'pending' FOR UPDATE
    ");
    $stmt->execute([$payment_id]);
    $p = $stmt->fetch();
    if (!$p) { throw new Exception("ไม่พบรายการนี้ หรือถูกดำเนินการไปแล้ว"); }

    $pdo->prepare("UPDATE payments SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?")
        ->execute([$reason, $admin_id, $payment_id]);

    if ($p['kind'] === 'new') {
        $pdo->prepare("UPDATE rentals SET status = 'rejected' WHERE id = ?")->execute([$p['rental_id']]);
        $pdo->prepare("UPDATE lockers SET state = 'available' WHERE id = ?")->execute([$p['locker_id']]);
    }
    // kind = 'extend' or 'penalty' rejections don't touch the rental —
    // it just stays at its current status (still 'expired' for a
    // rejected penalty payment) so the user can submit another slip.

    log_activity($pdo, $p['locker_id'], "แอดมิน", "ปฏิเสธสลิป #" . $p['ref_code'] . ": " . $reason);

    $pdo->commit();
    json_out(["ok" => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_out(["ok" => false, "error" => $e->getMessage()], 409);
}
