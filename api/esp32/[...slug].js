// Vercel's Hobby plan caps a deployment at 12 Serverless Functions — one
// file per endpoint (37 of them) blew way past that. This catch-all
// collapses every /api/esp32/* path into a single function that dispatches
// by action name; the actual handler files live under api/_esp32/ (the
// leading underscore excludes that whole folder from being counted as
// functions in the first place).
const routes = {
  poll: require("../_esp32/poll"),
  verify_pin: require("../_esp32/verify_pin"),
  door_status: require("../_esp32/door_status"),
  check_locker: require("../_esp32/check_locker"),
};

module.exports = async (req, res) => {
  const [action] = req.query.slug || [];
  const handler = routes[action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
