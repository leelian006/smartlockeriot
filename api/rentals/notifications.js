const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rows } = await query(
    `SELECT p.id, p.ref_code, p.kind, p.reject_reason, r.locker_id, p.reviewed_at
     FROM payments p
     JOIN rentals r ON r.id = p.rental_id
     WHERE r.user_id = $1 AND p.status = 'rejected'
     ORDER BY p.reviewed_at DESC
     LIMIT 10`,
    [userId]
  );

  jsonOut(res, 200, { ok: true, notifications: rows });
};
