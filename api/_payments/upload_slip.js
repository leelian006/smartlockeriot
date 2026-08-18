// The one endpoint with a real shape change from the PHP version: multipart
// parsed via formidable, file goes to Supabase Storage instead of
// move_uploaded_file() into a local uploads/ folder (Vercel functions have
// no persistent writable disk).
const formidable = require("formidable");
const fs = require("fs");
const crypto = require("crypto");
const { query } = require("../_lib/db");
const { jsonOut } = require("../_lib/json");
const { requireUser } = require("../_lib/auth");
const { uploadSlip } = require("../_lib/storage");
const { refCode } = require("../_lib/refcode");
const { PRICING, PENALTY_AMOUNT } = require("../_lib/pricing");

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"];
const MIME_BY_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm({ maxFileSize: 10 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

module.exports = async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    return jsonOut(res, 400, { ok: false, error: "อัปโหลดไม่สำเร็จ" });
  }

  const field = (name) => (Array.isArray(fields[name]) ? fields[name][0] : fields[name]);
  const rentalId = field("rental_id");
  const kind = field("kind") || "new";

  if (!["new", "extend", "penalty"].includes(kind)) {
    return jsonOut(res, 400, { ok: false, error: "ประเภทการชำระเงินไม่ถูกต้อง" });
  }

  const { rows } = await query("SELECT * FROM rentals WHERE id = $1 AND user_id = $2", [rentalId, userId]);
  const rental = rows[0];
  if (!rental) return jsonOut(res, 404, { ok: false, error: "ไม่พบรายการเช่านี้" });

  let durationMinutes, price;
  if (kind === "penalty") {
    if (rental.status !== "expired") {
      return jsonOut(res, 400, { ok: false, error: "รายการนี้ยังไม่เกินเวลา" });
    }
    durationMinutes = 0;
    price = PENALTY_AMOUNT;
  } else {
    durationMinutes = Number(field("duration_minutes"));
    price = Number(field("price"));
    if (!(durationMinutes in PRICING) || PRICING[durationMinutes] !== price) {
      return jsonOut(res, 400, { ok: false, error: "ระยะเวลาหรือราคาไม่ถูกต้อง" });
    }
  }

  const fileField = files.slip;
  const file = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!file) return jsonOut(res, 400, { ok: false, error: "กรุณาแนบสลิปการโอนเงิน" });

  const originalName = file.originalFilename || file.name || "";
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return jsonOut(res, 400, { ok: false, error: "รองรับเฉพาะไฟล์ jpg, jpeg, png, webp" });
  }

  const filename = `slip_${rentalId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const buffer = fs.readFileSync(file.filepath || file.path);

  try {
    await uploadSlip(buffer, filename, MIME_BY_EXT[ext]);
  } catch (err) {
    return jsonOut(res, 500, { ok: false, error: "อัปโหลดไฟล์ไม่สำเร็จ" });
  }

  const code = refCode();
  await query(
    `INSERT INTO payments (rental_id, kind, ref_code, amount, duration_minutes, slip_path, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
    [rentalId, kind, code, price, durationMinutes, filename]
  );

  jsonOut(res, 200, { ok: true, ref_code: code });
};
