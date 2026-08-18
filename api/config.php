<?php
// ---------------------------------------------------------------
// PetalLock Smart Locker — shared config
// Included by every endpoint file. Handles DB connection, JSON
// helpers, CORS, and session-based auth guards.
// ---------------------------------------------------------------

// --- Database connection -----------------------------------------------
$DB_HOST = "localhost";
$DB_NAME = "smart_locker";
$DB_USER = "root";
$DB_PASS = "";          // XAMPP default: empty password

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["ok" => false, "error" => "Database connection failed: " . $e->getMessage()]));
}

// --- CORS (allow the frontend to call these endpoints with cookies) ----
// If the HTML/JS is served from the SAME Apache/XAMPP as this API,
// you can leave this as-is. If serving the frontend elsewhere, set
// the exact origin below (not "*") since we use cookies for sessions.
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

// --- Helpers -------------------------------------------------------------
function json_out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_user() {
    if (empty($_SESSION['user_id'])) {
        json_out(["ok" => false, "error" => "กรุณาเข้าสู่ระบบก่อน"], 401);
    }
    return $_SESSION['user_id'];
}

function require_admin() {
    if (empty($_SESSION['admin_id'])) {
        json_out(["ok" => false, "error" => "ต้องเข้าสู่ระบบผู้ดูแลระบบก่อน"], 401);
    }
    return $_SESSION['admin_id'];
}

// --- ESP32 device auth ---------------------------------------------------
// Simple shared-secret key instead of sessions, since the ESP32 can't
// hold a login cookie. Change this to something long and random, and
// put the same value in the ESP32 firmware's request headers.
define("DEVICE_API_KEY", "CHANGE_ME_TO_A_LONG_RANDOM_STRING");

function require_device() {
    $key = $_SERVER['HTTP_X_DEVICE_KEY'] ?? '';
    if (!hash_equals(DEVICE_API_KEY, $key)) {
        json_out(["ok" => false, "error" => "invalid device key"], 401);
    }
}

function ref_code() {
    return "RQ" . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
}

function log_activity($pdo, $locker_id, $actor, $action) {
    $stmt = $pdo->prepare("INSERT INTO activity_log (locker_id, actor, action) VALUES (?, ?, ?)");
    $stmt->execute([$locker_id, $actor, $action]);
}
