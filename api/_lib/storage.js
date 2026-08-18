const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "slips";

// buffer: Buffer, filename: e.g. "slip_12_1699999999_ab12cd34.jpg"
async function uploadSlip(buffer, filename, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType, upsert: false });
  if (error) throw error;
  return filename; // stored as payments.slip_path
}

// Bucket is private — admin views resolve this to a short-lived URL instead
// of relying on a public bucket, unlike the old world-readable uploads/ folder.
async function signedSlipUrl(path, expiresInSeconds) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds || 3600);
  if (error) return null;
  return data.signedUrl;
}

module.exports = { uploadSlip, signedSlipUrl };
