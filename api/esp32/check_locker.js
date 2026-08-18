// Called by the ESP32 right after a locker is selected on the keypad, before
// showing the PIN-entry screen, so it can show "overtime, pay online"
// instead of prompting for a PIN it knows won't be accepted.
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireDevice } = require("../_lib/auth");

module.exports = async (req, res) => {
  if (!requireDevice(req, res)) return;

  const lockerId = req.query.locker_id || "";
  if (!lockerId) return jsonOut(res, 400, { ok: false, error: "missing locker_id" });

  const { rows } = await query(
    `SELECT status FROM rentals
     WHERE locker_id = $1 AND status IN ('awaiting_door','active','expired') AND pin_set = TRUE
     ORDER BY id DESC LIMIT 1`,
    [lockerId]
  );

  jsonOut(res, 200, { ok: true, status: rows[0] ? rows[0].status : "none" });
};
