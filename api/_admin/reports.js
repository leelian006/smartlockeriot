const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const today = await query(
    `SELECT COALESCE(SUM(amount),0) s FROM payments
     WHERE status = 'confirmed' AND reviewed_at::date = CURRENT_DATE`
  );
  const week = await query(
    `SELECT COALESCE(SUM(amount),0) s FROM payments
     WHERE status = 'confirmed' AND reviewed_at >= CURRENT_DATE - INTERVAL '6 days'`
  );
  const lifetime = await query(
    `SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM payments WHERE status = 'confirmed'`
  );
  const daily = await query(
    `SELECT reviewed_at::date AS d, SUM(amount) AS total FROM payments
     WHERE status = 'confirmed' AND reviewed_at >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY reviewed_at::date ORDER BY d ASC`
  );

  const rentalCount = Number(lifetime.rows[0].c);
  const lifetimeSum = Number(lifetime.rows[0].s);
  const average = rentalCount > 0 ? Math.round((lifetimeSum / rentalCount) * 100) / 100 : 0;

  jsonOut(res, 200, {
    ok: true,
    today_total: Number(today.rows[0].s),
    week_total: Number(week.rows[0].s),
    rental_count: rentalCount,
    average,
    daily: daily.rows.map((r) => ({ d: r.d, total: Number(r.total) })),
  });
};
