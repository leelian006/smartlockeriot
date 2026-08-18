const { jsonOut } = require("./json");

// Every resource's thin router (api/esp32.js, api/auth.js, ...) calls this
// instead of invoking the matched handler directly. Two things it fixes
// over a bare call: (1) an uncaught error (e.g. the DB connection failing)
// used to crash the whole function and return Vercel's generic non-JSON
// error page, which then broke the frontend's res.json() parsing too —
// this turns it into a real {ok:false,error} JSON response instead; (2) one
// place to log the real error server-side for debugging.
async function dispatch(routes, req, res) {
  const handler = routes[req.query.action];
  if (!handler) return jsonOut(res, 404, { ok: false, error: "not found" });
  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      jsonOut(res, 500, { ok: false, error: err.message || "internal server error" });
    }
  }
}

module.exports = { dispatch };
