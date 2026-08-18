// Token-based auth has no server-side session to destroy — the client just
// discards its token. Kept as a route so common.js's doLogout() still has
// something to call (and so a future revocation list has somewhere to live).
const { jsonOut } = require("../_lib/json");

module.exports = async (req, res) => {
  jsonOut(res, 200, { ok: true });
};
