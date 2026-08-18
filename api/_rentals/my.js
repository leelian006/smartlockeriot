// "ตู้ที่กำลังเช่า" (my current rentals) — also lazily expires rentals on
// read (no cron job): if the countdown has hit zero for an 'active' rental,
// flip it to 'expired' right here and reflect that in the response.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rows } = await query(
    `SELECT r.id, r.locker_id, l.location, l.door_closed, r.status, r.pin_set,
            r.duration_minutes, r.price, r.started_at, r.expires_at
     FROM rentals r
     JOIN lockers l ON l.id = r.locker_id
     WHERE r.user_id = $1 AND r.status IN ('pending_pin','awaiting_door','active','expired')
     ORDER BY r.created_at DESC`,
    [userId]
  );

  const now = Date.now();
  const rentals = [];
  for (const r of rows) {
    let remainingSeconds = null;
    if (r.expires_at) {
      remainingSeconds = Math.max(0, Math.floor((new Date(r.expires_at).getTime() - now) / 1000));
    }
    let status = r.status;
    if (remainingSeconds === 0 && status === "active") {
      status = "expired";
      await query("UPDATE rentals SET status = 'expired' WHERE id = $1", [r.id]);
    }
    rentals.push({ ...r, status, remaining_seconds: remainingSeconds });
  }

  jsonOut(res, 200, { ok: true, rentals });
};
