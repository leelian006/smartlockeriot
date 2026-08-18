// See api/esp32.js and vercel.json for why this is one file with an
// ?action= dispatch instead of one file per endpoint.
const { dispatch } = require("./_lib/router");

const routes = {
  list: require("./_lockers/list"),
};

module.exports = (req, res) => dispatch(routes, req, res);
