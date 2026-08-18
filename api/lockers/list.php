<?php
require __DIR__ . "/../config.php";

$lockers = $pdo->query("SELECT id, location, state, door_closed FROM lockers ORDER BY id")->fetchAll();
foreach ($lockers as &$l) {
    // Same PDO string-vs-boolean issue as rentals/my.php — cast so
    // JS truthy checks (`!l.door_closed`) behave correctly.
    $l['door_closed'] = (bool)$l['door_closed'];
}
json_out(["ok" => true, "lockers" => $lockers]);
