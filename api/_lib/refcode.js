const crypto = require("crypto");

// Same shape as the old config.php ref_code(): "RQ" + 6 uppercase hex chars.
function refCode() {
  return "RQ" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

module.exports = { refCode };
