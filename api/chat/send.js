// Deliberately hardcodes sender='user' rather than inferring role from the
// token — kept as a separate route from admin_send.js by design, so a
// browser holding both a user and admin session/token can't get ambiguous
// behavior from one shared endpoint.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { message = "" } = req.body || {};
  if (!String(message).trim()) return jsonOut(res, 400, { ok: false, error: "กรุณากรอกข้อความ" });

  await query("INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, 'user', $2)", [
    userId,
    message,
  ]);

  jsonOut(res, 200, { ok: true });
};
