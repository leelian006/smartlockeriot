// See vercel.json — rewrites map /api/esp32/<action> to this single
// function with ?action=<action>, so the whole esp32/ resource area only
// costs one Serverless Function against Vercel's 12-function Hobby cap
// (bracket dynamic routes ([...slug].js] didn't get picked up on this
// project's "Other" framework config, so this uses plain rewrites instead,
// which are guaranteed to work regardless of framework detection).
const routes = {
  poll: require("./_esp32/poll"),
  verify_pin: require("./_esp32/verify_pin"),
  door_status: require("./_esp32/door_status"),
  check_locker: require("./_esp32/check_locker"),
};

module.exports = async (req, res) => {
  const handler = routes[req.query.action];
  if (!handler) return res.status(404).json({ ok: false, error: "not found" });
  return handler(req, res);
};
