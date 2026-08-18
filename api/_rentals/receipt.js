const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const rentalId = req.query.rental_id;

  const { rows } = await query(
    `SELECT p.ref_code, p.amount, p.duration_minutes, p.created_at, r.locker_id
     FROM payments p
     JOIN rentals r ON r.id = p.rental_id
     WHERE p.rental_id = $1 AND p.kind = 'new' AND p.status = 'confirmed' AND r.user_id = $2
     ORDER BY p.id DESC LIMIT 1`,
    [rentalId, userId]
  );
  if (!rows[0]) return jsonOut(res, 404, { ok: false, error: "ไม่พบข้อมูลใบเสร็จ" });

  jsonOut(res, 200, { ok: true, receipt: rows[0] });
};
