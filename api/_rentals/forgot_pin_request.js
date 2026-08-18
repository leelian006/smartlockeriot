// OTP is generated but not actually sent anywhere (no SMS gateway wired up
// yet, same as the PHP version) — for testing, look it up directly in the
// pin_reset_otps table.
const crypto = require("crypto");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rental_id: rentalId } = req.body || {};

  const { rows } = await query(
    "SELECT id FROM rentals WHERE id = $1 AND user_id = $2 AND pin_set = TRUE",
    [rentalId, userId]
  );
  if (!rows[0]) return jsonOut(res, 404, { ok: false, error: "ไม่พบรายการเช่านี้" });

  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    "INSERT INTO pin_reset_otps (rental_id, otp_code, expires_at) VALUES ($1, $2, $3)",
    [rentalId, otp, expiresAt]
  );

  jsonOut(res, 200, { ok: true, message: "ส่งรหัสยืนยันไปยังเบอร์โทรศัพท์ที่ลงทะเบียนแล้ว" });
};
