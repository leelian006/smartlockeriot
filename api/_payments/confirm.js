// Central state-machine transition point for rentals/lockers. Runs inside a
// transaction with SELECT ... FOR UPDATE, same concurrency guarantee as the
// PHP version.
const { withTransaction } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  const adminId = requireAdmin(req, res);
  if (!adminId) return;

  const { payment_id: paymentId } = req.body || {};
  if (!paymentId) return jsonOut(res, 400, { ok: false, error: "missing payment_id" });

  try {
    const message = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT p.*, r.locker_id, r.status AS rental_status, r.expires_at,
                u.first_name, u.last_name
         FROM payments p
         JOIN rentals r ON r.id = p.rental_id
         JOIN users u ON u.id = r.user_id
         WHERE p.id = $1 AND p.status = 'pending'
         FOR UPDATE`,
        [paymentId]
      );
      const p = rows[0];
      if (!p) throw new Error("ไม่พบรายการนี้ หรือถูกดำเนินการไปแล้ว");

      await client.query(
        "UPDATE payments SET status = 'confirmed', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2",
        [adminId, p.id]
      );

      let note;
      if (p.kind === "new") {
        await client.query("UPDATE rentals SET status = 'pending_pin' WHERE id = $1", [p.rental_id]);
        await client.query("UPDATE lockers SET state = 'occupied' WHERE id = $1", [p.locker_id]);
        note = "ยืนยันการชำระเงินสำเร็จ — พร้อมให้ลูกค้าตั้งรหัสผ่าน";
      } else if (p.kind === "penalty") {
        await client.query("UPDATE rentals SET status = 'completed' WHERE id = $1", [p.rental_id]);
        await client.query("UPDATE lockers SET state = 'available' WHERE id = $1", [p.locker_id]);
        note = "ยืนยันค่าปรับสำเร็จ — ตู้ว่างพร้อมใช้งาน";
      } else {
        const base = Math.max(
          p.expires_at ? new Date(p.expires_at).getTime() : Date.now(),
          Date.now()
        );
        const newExpiresAt = new Date(base + p.duration_minutes * 60 * 1000);
        await client.query(
          "UPDATE rentals SET expires_at = $1, status = 'active' WHERE id = $2",
          [newExpiresAt, p.rental_id]
        );
        note = "ยืนยันการต่อเวลาสำเร็จ";
      }

      await client.query(
        "INSERT INTO unlock_commands (locker_id, reason) VALUES ($1, 'admin_confirm')",
        [p.locker_id]
      );
      await client.query(
        "INSERT INTO activity_log (locker_id, actor, action) VALUES ($1, $2, $3)",
        [p.locker_id, `${p.first_name} ${p.last_name}`, `ชำระเงินสำเร็จ (#${p.ref_code})`]
      );

      return note;
    });

    jsonOut(res, 200, { ok: true, message });
  } catch (err) {
    jsonOut(res, 409, { ok: false, error: err.message });
  }
};
