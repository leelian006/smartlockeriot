// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const { dispatch } = require("./_lib/router");

const routes = {
  overview: require("./_admin/overview"),
  emergency_unlock: require("./_admin/emergency_unlock"),
  reports: require("./_admin/reports"),
  update_locker: require("./_admin/update_locker"),
  get_settings: require("./_admin/get_settings"),
  update_settings: require("./_admin/update_settings"),
  users: require("./_admin/users"),
};

module.exports = (req, res) => dispatch(routes, req, res);
