// See api/esp32/[...slug].js for why this file exists (Vercel's 12-function
// cap on the Hobby plan) — one catch-all per resource, dispatching to the
// handlers under api/_chat/ (excluded from the function count).
const routes = {
  conversations: require("../_chat/conversations"),
  send: require("../_chat/send"),
  admin_send: require("../_chat/admin_send"),
  messages: require("../_chat/messages"),
  admin_messages: require("../_chat/admin_messages"),
};

module.exports = async (req, res) => {
  const [action] = req.query.slug || [];
  const handler = routes[action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
