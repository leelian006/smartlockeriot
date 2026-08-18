// ESP32 calls this every 3-5 seconds per locker to check whether it should
// fire the relay/solenoid.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireDevice } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireDevice(req, res)) return;

  const lockerId = req.query.locker_id || "";
  if (!lockerId) return jsonOut(res, 400, { ok: false, error: "missing locker_id" });

  const { rows } = await query(
    `SELECT id, reason FROM unlock_commands
     WHERE locker_id = $1 AND consumed = FALSE
     ORDER BY id ASC LIMIT 1`,
    [lockerId]
  );
  const cmd = rows[0];
  if (!cmd) return jsonOut(res, 200, { ok: true, unlock: false });

  await query("UPDATE unlock_commands SET consumed = TRUE WHERE id = $1", [cmd.id]);
  jsonOut(res, 200, { ok: true, unlock: true, reason: cmd.reason });
};
