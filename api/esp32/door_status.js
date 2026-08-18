// ESP32 calls this whenever the MC-38 reed switch changes state (or on a
// heartbeat interval). Also drives "timer starts when the door actually
// closes": if a locker has a rental in 'awaiting_door' and this reports the
// door as closed, the countdown starts right here.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireDevice } = require("../_lib/auth");
const { logActivity } = require("../_lib/activity");

module.exports = async (req, res) => {
  if (!requireDevice(req, res)) return;

  const { locker_id: lockerId = "", door_closed } = req.body || {};
  const doorClosed = !!door_closed;

  await query("UPDATE lockers SET door_closed = $1 WHERE id = $2", [doorClosed, lockerId]);

  const { rows } = await query(
    `SELECT r.id, r.duration_minutes, u.first_name, u.last_name
     FROM rentals r
     JOIN users u ON u.id = r.user_id
     WHERE r.locker_id = $1 AND r.status = 'awaiting_door'
     ORDER BY r.id DESC LIMIT 1`,
    [lockerId]
  );
  const awaitingRental = rows[0];

  if (awaitingRental) {
    if (doorClosed) {
      const expiresAt = new Date(Date.now() + awaitingRental.duration_minutes * 60 * 1000);
      await query(
        "UPDATE rentals SET status = 'active', started_at = NOW(), expires_at = $1 WHERE id = $2",
        [expiresAt, awaitingRental.id]
      );
      await logActivity(
        lockerId,
        `${awaitingRental.first_name} ${awaitingRental.last_name}`,
        "ปิดประตูสนิท — เริ่มนับเวลาเช่าแล้ว"
      );
    } else {
      await logActivity(lockerId, "ระบบ (MC-38)", "รอปิดประตูเพื่อเริ่มนับเวลา — ประตูยังไม่ปิดสนิท");
    }
  } else if (!doorClosed) {
    await logActivity(lockerId, "ระบบ (MC-38)", "ตรวจพบการเปิดประตูผิดปกติ");
  }

  jsonOut(res, 200, { ok: true });
};
