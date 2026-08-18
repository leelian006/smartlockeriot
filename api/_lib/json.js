// Mirrors the old config.php json_out() helper.
function jsonOut(res, status, body) {
  res.status(status).json(body);
}

module.exports = { jsonOut };
