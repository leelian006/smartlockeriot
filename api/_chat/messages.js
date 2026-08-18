const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { rows } = await query(
    "SELECT sender, message, created_at FROM chat_messages WHERE user_id = $1 ORDER BY id ASC",
    [userId]
  );
  await query("UPDATE chat_messages SET is_read = TRUE WHERE user_id = $1 AND sender = 'admin'", [userId]);

  jsonOut(res, 200, { ok: true, messages: rows });
};
