const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const userId = req.query.user_id || "";
  if (!userId) return jsonOut(res, 400, { ok: false, error: "missing user_id" });

  const { rows } = await query(
    "SELECT sender, message, created_at FROM chat_messages WHERE user_id = $1 ORDER BY id ASC",
    [userId]
  );
  await query("UPDATE chat_messages SET is_read = TRUE WHERE user_id = $1 AND sender = 'user'", [userId]);

  jsonOut(res, 200, { ok: true, messages: rows });
};
