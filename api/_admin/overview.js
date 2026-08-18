const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const total = await query("SELECT COUNT(*) c FROM lockers");
  const available = await query("SELECT COUNT(*) c FROM lockers WHERE state = 'available'");
  const occupied = await query("SELECT COUNT(*) c FROM lockers WHERE state = 'occupied'");
  const doorAlerts = await query("SELECT COUNT(*) c FROM lockers WHERE door_closed = FALSE");
  const activity = await query(
    "SELECT locker_id, actor, action, created_at FROM activity_log ORDER BY id DESC LIMIT 15"
  );

  jsonOut(res, 200, {
    ok: true,
    stats: {
      total: Number(total.rows[0].c),
      available: Number(available.rows[0].c),
      occupied: Number(occupied.rows[0].c),
      door_alerts: Number(doorAlerts.rows[0].c),
    },
    activity: activity.rows,
  });
};
