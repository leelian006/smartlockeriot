const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");
const { signedSlipUrl } = require("../_lib/storage");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { rows } = await query(`
    SELECT p.id, p.ref_code, p.kind, p.amount, p.duration_minutes, p.slip_path, p.created_at,
           r.locker_id, u.first_name, u.last_name
    FROM payments p
    JOIN rentals r ON r.id = p.rental_id
    JOIN users u ON u.id = r.user_id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC
  `);

  const pending = await Promise.all(
    rows.map(async (r) => ({ ...r, slip_url: await signedSlipUrl(r.slip_path) }))
  );

  jsonOut(res, 200, { ok: true, pending });
};
