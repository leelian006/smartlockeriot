const { withTransaction } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");
const { PRICING } = require("../_lib/pricing");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { locker_id: lockerId, duration_minutes: durationRaw, price: priceRaw } = req.body || {};
  const durationMinutes = Number(durationRaw);
  const price = Number(priceRaw);

  if (!(durationMinutes in PRICING) || PRICING[durationMinutes] !== price) {
    return jsonOut(res, 400, { ok: false, error: "ระยะเวลาหรือราคาไม่ถูกต้อง" });
  }

  try {
    const rentalId = await withTransaction(async (client) => {
      const { rows } = await client.query("SELECT state FROM lockers WHERE id = $1 FOR UPDATE", [lockerId]);
      const locker = rows[0];
      if (!locker || locker.state !== "available") {
        throw new Error("ตู้นี้ไม่ว่างในขณะนี้");
      }

      const inserted = await client.query(
        `INSERT INTO rentals (locker_id, user_id, status, duration_minutes, price)
         VALUES ($1, $2, 'pending_payment', $3, $4) RETURNING id`,
        [lockerId, userId, durationMinutes, price]
      );
      return inserted.rows[0].id;
    });

    jsonOut(res, 200, { ok: true, rental_id: rentalId });
  } catch (err) {
    jsonOut(res, 409, { ok: false, error: err.message });
  }
};
