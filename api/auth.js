// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const { dispatch } = require("./_lib/router");

const routes = {
  register: require("./_auth/register"),
  login: require("./_auth/login"),
  admin_login: require("./_auth/admin_login"),
  logout: require("./_auth/logout"),
  me: require("./_auth/me"),
  update_profile: require("./_auth/update_profile"),
};

module.exports = (req, res) => dispatch(routes, req, res);
