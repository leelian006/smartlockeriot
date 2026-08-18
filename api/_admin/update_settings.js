const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { location_name, unlock_hold_seconds, notify_hours_before } = req.body || {};
  const holdSec = Number(unlock_hold_seconds);
  const notifyHours = Number(notify_hours_before);

  if (!location_name || !String(location_name).trim() || !(holdSec >= 1) || !(notifyHours >= 0)) {
    return jsonOut(res, 400, { ok: false, error: "ข้อมูลไม่ถูกต้อง" });
  }

  await query(
    "UPDATE system_settings SET location_name = $1, unlock_hold_seconds = $2, notify_hours_before = $3 WHERE id = 1",
    [location_name, holdSec, notifyHours]
  );

  jsonOut(res, 200, { ok: true });
};
