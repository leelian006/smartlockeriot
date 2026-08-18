// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const { dispatch } = require("./_lib/router");

const routes = {
  pending: require("./_payments/pending"),
  upload_slip: require("./_payments/upload_slip"),
  confirm: require("./_payments/confirm"),
  reject: require("./_payments/reject"),
};

module.exports = (req, res) => dispatch(routes, req, res);
