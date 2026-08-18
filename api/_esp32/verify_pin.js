// Called by the ESP32 every time someone types 4 digits on the Keypad 4x4 to
// retrieve their item. Locks out after 5 wrong attempts for 5 minutes.
const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireDevice } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  if (!requireDevice(req, res)) return;

  const { locker_id: lockerId = "", pin = "" } = req.body || {};

  const { rows } = await query(
    `SELECT * FROM rentals
     WHERE locker_id = $1 AND status IN ('awaiting_door','active','expired') AND pin_set = TRUE
     ORDER BY id DESC LIMIT 1`,
    [lockerId]
  );
  const rental = rows[0];

  if (!rental) {
    return jsonOut(res, 404, { ok: false, unlock: false, error: "ตู้นี้ไม่มีการเช่าที่ใช้งานอยู่" });
  }

  if (rental.status === "expired") {
    return jsonOut(res, 200, {
      ok: false, unlock: false, overtime: true,
      error: "ตู้ของคุณเกินเวลาที่กำหนด กรุณาชำระค่าปรับผ่านเว็บไซต์",
    });
  }

  if (rental.pin_locked_until && new Date(rental.pin_locked_until).getTime() > Date.now()) {
    const waitSec = Math.ceil((new Date(rental.pin_locked_until).getTime() - Date.now()) / 1000);
    return jsonOut(res, 423, { ok: false, unlock: false, error: `กรอกรหัสผิดหลายครั้ง กรุณารออีก ${waitSec} วินาที` });
  }

  const correct = await bcrypt.compare(pin, rental.pin_hash || "");
  if (!correct) {
    let fails = rental.pin_fail_count + 1;
    let lockedUntil = null;
    if (fails >= 5) {
      lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      fails = 0;
    }
    await query(
      "UPDATE rentals SET pin_fail_count = $1, pin_locked_until = $2 WHERE id = $3",
      [fails, lockedUntil, rental.id]
    );
    return jsonOut(res, 200, { ok: true, unlock: false, error: "รหัสผ่านไม่ถูกต้อง" });
  }

  // Correct PIN — retrieval step: rental ends, locker frees up immediately.
  await query(
    "UPDATE rentals SET pin_fail_count = 0, pin_locked_until = NULL, status = 'completed' WHERE id = $1",
    [rental.id]
  );
  await query("UPDATE lockers SET state = 'available' WHERE id = $1", [lockerId]);
  await logActivity(lockerId, "ระบบ (Keypad)", "นำของออกสำเร็จ — ตู้ว่างพร้อมใช้งาน");

  jsonOut(res, 200, { ok: true, unlock: true });
};
