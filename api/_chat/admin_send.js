const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { message = "", user_id: targetUserId } = req.body || {};
  if (!String(message).trim() || !targetUserId) {
    return jsonOut(res, 400, { ok: false, error: "ข้อมูลไม่ครบถ้วน" });
  }

  await query("INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, 'admin', $2)", [
    targetUserId,
    message,
  ]);

  jsonOut(res, 200, { ok: true });
};
