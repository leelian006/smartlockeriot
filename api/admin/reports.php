<?php
require __DIR__ . "/../config.php";
require_admin();

$today = (float)$pdo->query("
    SELECT COALESCE(SUM(amount),0) s FROM payments
    WHERE status = 'confirmed' AND DATE(reviewed_at) = CURDATE()
")->fetch()['s'];

$week = (float)$pdo->query("
    SELECT COALESCE(SUM(amount),0) s FROM payments
    WHERE status = 'confirmed' AND reviewed_at >= (CURDATE() - INTERVAL 6 DAY)
")->fetch()['s'];

$count = (int)$pdo->query("SELECT COUNT(*) c FROM payments WHERE status = 'confirmed'")->fetch()['c'];
$avg = $count ? round(((float)$pdo->query("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status='confirmed'")->fetch()['s']) / $count) : 0;

$daily = $pdo->query("
    SELECT DATE(reviewed_at) d, SUM(amount) total
    FROM payments
    WHERE status = 'confirmed' AND reviewed_at >= (CURDATE() - INTERVAL 6 DAY)
    GROUP BY DATE(reviewed_at)
    ORDER BY d ASC
")->fetchAll();

json_out([
    "ok" => true,
    "today_total" => $today,
    "week_total" => $week,
    "rental_count" => $count,
    "average" => $avg,
    "daily" => $daily
]);
