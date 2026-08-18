// See api/esp32/[...slug].js for why this file exists (Vercel's 12-function
// cap on the Hobby plan) — one catch-all per resource, dispatching to the
// handlers under api/_payments/ (excluded from the function count).
const routes = {
  pending: require("../_payments/pending"),
  upload_slip: require("../_payments/upload_slip"),
  confirm: require("../_payments/confirm"),
  reject: require("../_payments/reject"),
};

module.exports = async (req, res) => {
  const [action] = req.query.slug || [];
  const handler = routes[action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
