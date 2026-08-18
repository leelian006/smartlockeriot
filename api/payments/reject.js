const { withTransaction } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  const adminId = requireAdmin(req, res);
  if (!adminId) return;

  const { payment_id: paymentId, reason = "" } = req.body || {};
  if (!paymentId || !String(reason).trim()) {
    return jsonOut(res, 400, { ok: false, error: "กรุณาระบุเหตุผล" });
  }

  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT p.*, r.locker_id FROM payments p
         JOIN rentals r ON r.id = p.rental_id
         WHERE p.id = $1 AND p.status = 'pending'
         FOR UPDATE`,
        [paymentId]
      );
      const p = rows[0];
      if (!p) throw new Error("ไม่พบรายการนี้ หรือถูกดำเนินการไปแล้ว");

      await client.query(
        "UPDATE payments SET status = 'rejected', reject_reason = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3",
        [reason, adminId, p.id]
      );

      // Extend/penalty rejections deliberately leave rental status untouched
      // (a rejected penalty stays 'expired' so the user can resubmit).
      if (p.kind === "new") {
        await client.query("UPDATE rentals SET status = 'rejected' WHERE id = $1", [p.rental_id]);
        await client.query("UPDATE lockers SET state = 'available' WHERE id = $1", [p.locker_id]);
      }

      await client.query(
        "INSERT INTO activity_log (locker_id, actor, action) VALUES ($1, $2, $3)",
        [p.locker_id, "แอดมิน", `ปฏิเสธสลิป #${p.ref_code}: ${reason}`]
      );
    });

    jsonOut(res, 200, { ok: true });
  } catch (err) {
    jsonOut(res, 409, { ok: false, error: err.message });
  }
};
