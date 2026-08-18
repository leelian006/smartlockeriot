const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");

module.exports = async (req, res) => {
  const { rows } = await query(
    "SELECT id, location, state, door_closed FROM lockers ORDER BY id"
  );
  jsonOut(res, 200, { ok: true, lockers: rows });
};
