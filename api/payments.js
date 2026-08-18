// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const routes = {
  pending: require("./_payments/pending"),
  upload_slip: require("./_payments/upload_slip"),
  confirm: require("./_payments/confirm"),
  reject: require("./_payments/reject"),
};

module.exports = async (req, res) => {
  const handler = routes[req.query.action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
