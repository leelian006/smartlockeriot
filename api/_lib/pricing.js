// Was duplicated in rentals/create.php and payments/upload_slip.php — one
// shared table now. Keys are duration_minutes, values are price in บาท.
const PRICING = { 10: 10, 30: 20, 60: 30 };
const PENALTY_AMOUNT = 100;

module.exports = { PRICING, PENALTY_AMOUNT };
