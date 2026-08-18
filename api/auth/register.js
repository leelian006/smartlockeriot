const bcrypt = require("bcryptjs");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");

module.exports = async (req, res) => {
  const { first_name, last_name, phone, email, password } = req.body || {};

  if (!first_name || !last_name || !phone || !email || !password) {
    return jsonOut(res, 400, { ok: false, error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }
  if (String(password).length < 6) {
    return jsonOut(res, 400, { ok: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
  }

  const dup = await query("SELECT id FROM users WHERE phone = $1 OR email = $2", [phone, email]);
  if (dup.rows[0]) {
    return jsonOut(res, 409, { ok: false, error: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้ไปแล้ว" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    "INSERT INTO users (first_name, last_name, phone, email, password_hash) VALUES ($1,$2,$3,$4,$5)",
    [first_name, last_name, phone, email, passwordHash]
  );

  jsonOut(res, 200, { ok: true, message: "สมัครสมาชิกสำเร็จ" });
};
