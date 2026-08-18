// Current "ปลดล็อก" (unlock/retrieve) flow — requires the correct PIN,
// completes the rental, frees the locker. Same brute-force lockout as the
// physical keypad (esp32/verify_pin.js): 5 wrong tries -> 5 min lockout.
//
// Important: a wrong PIN responds with HTTP 200 and {ok:true, unlock:false,
// error:"..."} — not a 4xx — the frontend depends on this exact shape.
const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rental_id: rentalId, pin = "" } = req.body || {};
  if (!/^\d{4}$/.test(pin)) {
    return jsonOut(res, 400, { ok: false, error: "รหัสผ่านต้องเป็นตัวเลข 4 หลัก" });
  }

  const { rows } = await query(
    `SELECT r.*, u.first_name, u.last_name
     FROM rentals r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1 AND r.user_id = $2 AND r.status IN ('awaiting_door','active','expired') AND r.pin_set = TRUE`,
    [rentalId, userId]
  );
  const rental = rows[0];
  if (!rental) return jsonOut(res, 404, { ok: false, error: "ไม่พบรายการเช่านี้" });

  if (rental.status === "expired") {
    return jsonOut(res, 400, { ok: false, error: "ตู้นี้เกินเวลาที่กำหนดแล้ว กรุณาชำระค่าปรับก่อนนำของออก" });
  }

  if (rental.pin_locked_until && new Date(rental.pin_locked_until).getTime() > Date.now()) {
    const waitSec = Math.ceil((new Date(rental.pin_locked_until).getTime() - Date.now()) / 1000);
    return jsonOut(res, 423, { ok: false, error: `กรอกรหัสผิดหลายครั้ง กรุณารออีก ${waitSec} วินาที` });
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

  await query(
    "UPDATE rentals SET pin_fail_count = 0, pin_locked_until = NULL, status = 'completed' WHERE id = $1",
    [rental.id]
  );
  await query("UPDATE lockers SET state = 'available' WHERE id = $1", [rental.locker_id]);
  await query("INSERT INTO unlock_commands (locker_id, reason) VALUES ($1, 'user_unlock')", [rental.locker_id]);
  await logActivity(rental.locker_id, `${rental.first_name} ${rental.last_name}`, "นำของออกสำเร็จผ่านเว็บ — ตู้ว่างพร้อมใช้งาน");

  jsonOut(res, 200, { ok: true, unlock: true });
};
