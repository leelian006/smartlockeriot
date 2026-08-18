// New endpoint — the old PHP dashboards got the logged-in user/admin's
// profile via an inline session-bound query at page-render time. Static
// pages have no server render step, so the dashboards call this on load.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { readToken } = require("../_lib/auth");

module.exports = async (req, res) => {
  const payload = readToken(req);
  if (!payload) return jsonOut(res, 401, { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" });

  if (payload.role === "admin") {
    const { rows } = await query("SELECT id, name FROM admins WHERE id = $1", [payload.sub]);
    if (!rows[0]) return jsonOut(res, 401, { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" });
    return jsonOut(res, 200, { ok: true, admin: rows[0] });
  }

  const { rows } = await query(
    "SELECT id, first_name, last_name, phone, email FROM users WHERE id = $1",
    [payload.sub]
  );
  if (!rows[0]) return jsonOut(res, 401, { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" });
  jsonOut(res, 200, { ok: true, user: rows[0] });
};
