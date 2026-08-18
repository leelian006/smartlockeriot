// See api/esp32/[...slug].js for why this file exists (Vercel's 12-function
// cap on the Hobby plan) — one catch-all per resource, dispatching to the
// handlers under api/_auth/ (excluded from the function count).
const routes = {
  register: require("../_auth/register"),
  login: require("../_auth/login"),
  admin_login: require("../_auth/admin_login"),
  logout: require("../_auth/logout"),
  me: require("../_auth/me"),
  update_profile: require("../_auth/update_profile"),
};

module.exports = async (req, res) => {
  const [action] = req.query.slug || [];
  const handler = routes[action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
