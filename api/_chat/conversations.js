const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { rows } = await query(`
    SELECT u.id AS user_id, u.first_name, u.last_name,
           (SELECT message FROM chat_messages m WHERE m.user_id = u.id ORDER BY m.id DESC LIMIT 1) AS last_message,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.user_id = u.id AND m.sender = 'user' AND m.is_read = FALSE) AS unread_count
    FROM users u
    WHERE EXISTS (SELECT 1 FROM chat_messages m WHERE m.user_id = u.id)
    ORDER BY (SELECT MAX(id) FROM chat_messages m WHERE m.user_id = u.id) DESC
  `);

  jsonOut(res, 200, {
    ok: true,
    conversations: rows.map((r) => ({ ...r, unread_count: Number(r.unread_count) })),
  });
};
