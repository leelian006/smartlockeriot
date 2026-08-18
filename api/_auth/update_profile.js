const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { first_name, last_name, phone, email, new_password } = req.body || {};
  if (!first_name || !last_name || !phone || !email) {
    return jsonOut(res, 400, { ok: false, error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }
  if (new_password && String(new_password).length < 6) {
    return jsonOut(res, 400, { ok: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
  }

  const dup = await query(
    "SELECT id FROM users WHERE (phone = $1 OR email = $2) AND id != $3",
    [phone, email, userId]
  );
  if (dup.rows[0]) {
    return jsonOut(res, 409, { ok: false, error: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้ไปแล้ว" });
  }

  if (new_password) {
    const passwordHash = await bcrypt.hash(new_password, 10);
    await query(
      "UPDATE users SET first_name=$1, last_name=$2, phone=$3, email=$4, password_hash=$5 WHERE id=$6",
      [first_name, last_name, phone, email, passwordHash, userId]
    );
  } else {
    await query(
      "UPDATE users SET first_name=$1, last_name=$2, phone=$3, email=$4 WHERE id=$5",
      [first_name, last_name, phone, email, userId]
    );
  }

  jsonOut(res, 200, { ok: true });
};
