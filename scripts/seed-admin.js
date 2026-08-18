// Creates the default admin login. Run this once yourself, locally:
//   DATABASE_URL="<your Supabase pooled connection string>" node scripts/seed-admin.js
//
// Replaces the old api/seed_admin.php, which was a one-time *unauthenticated
// browser hit* — fine on localhost XAMPP, not something worth leaving as a
// public endpoint on a real deployment. This is a local script instead.
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const USERNAME = "admin";
const PASSWORD = "admin1234";
const NAME = "Admin";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL first (see the comment at the top of this file).");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const existing = await pool.query("SELECT id FROM admins WHERE username = $1", [USERNAME]);
  if (existing.rows[0]) {
    console.log(`Admin "${USERNAME}" already exists (id=${existing.rows[0].id}) — nothing to do.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    "INSERT INTO admins (name, username, password_hash) VALUES ($1, $2, $3)",
    [NAME, USERNAME, passwordHash]
  );

  console.log(`Created admin login — username: ${USERNAME}  password: ${PASSWORD}`);
  console.log("Change this password after your first login.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
