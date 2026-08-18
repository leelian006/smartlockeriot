const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { signToken } = require("../_lib/auth");

module.exports = async (req, res) => {
  const { identifier = "", password = "" } = req.body || {};

  const { rows } = await query("SELECT * FROM users WHERE phone = $1 OR email = $1", [identifier]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return jsonOut(res, 401, { ok: false, error: "เบอร์โทร/อีเมล หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = signToken(user.id, "user");
  jsonOut(res, 200, {
    ok: true,
    token,
    user: { id: user.id, name: `${user.first_name} ${user.last_name}`, phone: user.phone, email: user.email },
  });
};
