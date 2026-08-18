const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rental_id: rentalId, otp = "", new_pin: newPin = "" } = req.body || {};

  if (!/^\d{4}$/.test(newPin)) {
    return jsonOut(res, 400, { ok: false, error: "รหัสผ่านต้องเป็นตัวเลข 4 หลัก" });
  }

  const { rows } = await query(
    `SELECT o.id FROM pin_reset_otps o
     JOIN rentals r ON r.id = o.rental_id
     WHERE o.rental_id = $1 AND o.otp_code = $2 AND o.used = FALSE
       AND o.expires_at > NOW() AND r.user_id = $3
     ORDER BY o.id DESC LIMIT 1`,
    [rentalId, otp, userId]
  );
  const otpRow = rows[0];
  if (!otpRow) return jsonOut(res, 400, { ok: false, error: "รหัสยืนยันไม่ถูกต้องหรือหมดอายุ" });

  await query("UPDATE pin_reset_otps SET used = TRUE WHERE id = $1", [otpRow.id]);

  const pinHash = await bcrypt.hash(newPin, 10);
  await query(
    "UPDATE rentals SET pin_hash = $1, pin_fail_count = 0, pin_locked_until = NULL WHERE id = $2",
    [pinHash, rentalId]
  );

  jsonOut(res, 200, { ok: true });
};
