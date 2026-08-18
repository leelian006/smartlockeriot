const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { jsonOut } = require("./json");

const JWT_SECRET = process.env.JWT_SECRET;

function signToken(id, role) {
  return jwt.sign({ sub: id, role }, JWT_SECRET, { expiresIn: "7d" });
}

function readToken(req) {
  const header = req.headers["authorization"] || "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return null;
  try {
    return jwt.verify(match[1], JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Returns the numeric user id on success. On failure, writes the 401 JSON
// response itself and returns null — callers must check for null and
// `return` immediately, same control flow as PHP's require_user()+exit.
function requireUser(req, res) {
  const payload = readToken(req);
  if (!payload || payload.role !== "user") {
    jsonOut(res, 401, { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" });
    return null;
  }
  return payload.sub;
}

function requireAdmin(req, res) {
  const payload = readToken(req);
  if (!payload || payload.role !== "admin") {
    jsonOut(res, 401, { ok: false, error: "ต้องเข้าสู่ระบบผู้ดูแลระบบก่อน" });
    return null;
  }
  return payload.sub;
}

// Constant-time compare, equivalent to PHP's hash_equals().
function requireDevice(req, res) {
  const key = req.headers["x-device-key"] || "";
  const expected = process.env.DEVICE_API_KEY || "";
  const a = Buffer.from(String(key));
  const b = Buffer.from(String(expected));
  const ok = a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
  if (!ok) {
    jsonOut(res, 401, { ok: false, error: "invalid device key" });
    return false;
  }
  return true;
}

module.exports = { signToken, readToken, requireUser, requireAdmin, requireDevice };
