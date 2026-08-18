const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { locker_id: lockerId, location = "" } = req.body || {};
  const trimmed = String(location).trim();
  if (!lockerId || !trimmed) {
    return jsonOut(res, 400, { ok: false, error: "กรุณาระบุตำแหน่งตู้" });
  }

  await query("UPDATE lockers SET location = $1 WHERE id = $2", [trimmed, lockerId]);
  await logActivity(lockerId, "แอดมิน", `แก้ไขตำแหน่งตู้เป็น "${trimmed}"`);

  jsonOut(res, 200, { ok: true });
};
