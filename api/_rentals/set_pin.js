const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rental_id: rentalId, pin = "" } = req.body || {};
  if (!/^\d{4}$/.test(pin)) {
    return jsonOut(res, 400, { ok: false, error: "รหัสผ่านต้องเป็นตัวเลข 4 หลัก" });
  }

  const { rows } = await query(
    "SELECT * FROM rentals WHERE id = $1 AND user_id = $2 AND status = 'pending_pin'",
    [rentalId, userId]
  );
  if (!rows[0]) return jsonOut(res, 404, { ok: false, error: "ไม่พบรายการเช่านี้" });

  const pinHash = await bcrypt.hash(pin, 10);
  await query(
    "UPDATE rentals SET pin_hash = $1, pin_set = TRUE, status = 'awaiting_door' WHERE id = $2",
    [pinHash, rentalId]
  );

  jsonOut(res, 200, { ok: true });
};
