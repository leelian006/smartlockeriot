// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const routes = {
  conversations: require("./_chat/conversations"),
  send: require("./_chat/send"),
  admin_send: require("./_chat/admin_send"),
  messages: require("./_chat/messages"),
  admin_messages: require("./_chat/admin_messages"),
};

module.exports = async (req, res) => {
  const handler = routes[req.query.action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
