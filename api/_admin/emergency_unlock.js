const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { locker_ids: lockerIds = [], reason = "" } = req.body || {};
  const trimmedReason = String(reason).trim();

  if (!Array.isArray(lockerIds) || lockerIds.length === 0 || !trimmedReason) {
    return jsonOut(res, 400, { ok: false, error: "กรุณาเลือกตู้อย่างน้อย 1 ตู้ และระบุเหตุผล" });
  }

  for (const id of lockerIds) {
    await query("INSERT INTO unlock_commands (locker_id, reason) VALUES ($1, 'emergency')", [id]);
    await logActivity(id, "ระบบ (แอดมิน)", "ปลดล็อกฉุกเฉิน: " + trimmedReason);
  }

  jsonOut(res, 200, { ok: true });
};
