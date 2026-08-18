<?php
require __DIR__ . "/../config.php";
require_admin();

$row = $pdo->query("SELECT location_name, unlock_hold_seconds, notify_hours_before FROM system_settings WHERE id = 1")->fetch();
json_out(["ok" => true, "settings" => $row]);
