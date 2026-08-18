const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { rows } = await query(
    "SELECT location_name, unlock_hold_seconds, notify_hours_before FROM system_settings WHERE id = 1"
  );
  jsonOut(res, 200, { ok: true, settings: rows[0] });
};
