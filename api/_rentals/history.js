const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rows } = await query(
    `SELECT r.locker_id, r.duration_minutes, p.amount, r.status, r.created_at
     FROM rentals r
     JOIN payments p ON p.rental_id = r.id AND p.status = 'confirmed' AND p.kind = 'new'
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  jsonOut(res, 200, { ok: true, history: rows });
};
