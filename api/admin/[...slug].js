// See api/esp32/[...slug].js for why this file exists (Vercel's 12-function
// cap on the Hobby plan) — one catch-all per resource, dispatching to the
// handlers under api/_admin/ (excluded from the function count).
const routes = {
  overview: require("../_admin/overview"),
  emergency_unlock: require("../_admin/emergency_unlock"),
  reports: require("../_admin/reports"),
  update_locker: require("../_admin/update_locker"),
  get_settings: require("../_admin/get_settings"),
  update_settings: require("../_admin/update_settings"),
  users: require("../_admin/users"),
};

module.exports = async (req, res) => {
  const [action] = req.query.slug || [];
  const handler = routes[action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
