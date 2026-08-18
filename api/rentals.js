// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const routes = {
  create: require("./_rentals/create"),
  history: require("./_rentals/history"),
  forgot_pin_request: require("./_rentals/forgot_pin_request"),
  forgot_pin_reset: require("./_rentals/forgot_pin_reset"),
  notifications: require("./_rentals/notifications"),
  receipt: require("./_rentals/receipt"),
  set_pin: require("./_rentals/set_pin"),
  my: require("./_rentals/my"),
  unlock: require("./_rentals/unlock"),
  verify_and_unlock: require("./_rentals/verify_and_unlock"),
};

module.exports = async (req, res) => {
  const handler = routes[req.query.action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
