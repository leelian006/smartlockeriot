const { query } = require("./db");

async function logActivity(lockerId, actor, action) {
  await query(
    "INSERT INTO activity_log (locker_id, actor, action) VALUES ($1, $2, $3)",
    [lockerId, actor, action]
  );
}

module.exports = { logActivity };
