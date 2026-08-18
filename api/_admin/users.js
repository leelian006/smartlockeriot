const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { rows } = await query(`
    SELECT u.id, u.first_name, u.last_name, u.phone,
           (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id) AS rental_count,
           (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id
              AND r.status IN ('active','pending_pin','awaiting_door','expired')) AS active_count
    FROM users u
    ORDER BY u.created_at DESC
  `);

  jsonOut(res, 200, {
    ok: true,
    users: rows.map((r) => ({
      ...r,
      rental_count: Number(r.rental_count),
      active_count: Number(r.active_count),
    })),
  });
};
