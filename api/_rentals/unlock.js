// Superseded by verify_and_unlock.js (no-PIN unlock) — the frontend no
// longer calls this, kept for parity with the PHP version.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rental_id: rentalId } = req.body || {};

  const { rows } = await query(
    `SELECT r.locker_id, u.first_name, u.last_name
     FROM rentals r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1 AND r.user_id = $2 AND r.status IN ('pending_pin','awaiting_door','active','expired')`,
    [rentalId, userId]
  );
  const rental = rows[0];
  if (!rental) return jsonOut(res, 404, { ok: false, error: "ไม่พบรายการเช่านี้" });

  await query("INSERT INTO unlock_commands (locker_id, reason) VALUES ($1, 'user_unlock')", [rental.locker_id]);
  await logActivity(rental.locker_id, `${rental.first_name} ${rental.last_name}`, "ปลดล็อกผ่านเว็บ");

  jsonOut(res, 200, { ok: true });
};
