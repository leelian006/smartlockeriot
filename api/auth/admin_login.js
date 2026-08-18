const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { signToken } = require("../_lib/auth");

module.exports = async (req, res) => {
  const { username = "", password = "" } = req.body || {};

  const { rows } = await query("SELECT * FROM admins WHERE username = $1", [username]);
  const admin = rows[0];

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return jsonOut(res, 401, { ok: false, error: "เบอร์โทร/อีเมล หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = signToken(admin.id, "admin");
  jsonOut(res, 200, { ok: true, token, admin: { id: admin.id, name: admin.name } });
};
