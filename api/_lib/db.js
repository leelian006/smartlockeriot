// Shared Postgres access for every API route.
//
// Prefers a pooled (pgbouncer) connection string — serverless functions
// open many short-lived connections and would exhaust Postgres's connection
// limit against the direct port otherwise. Accepts whichever variable name
// actually ends up set: DATABASE_URL if you added it by hand, or
// POSTGRES_URL/POSTGRES_PRISMA_URL if Vercel's Supabase integration
// injected it (its exact variable set has changed across integration
// versions, so this checks the common names instead of assuming one).
// Falls back to building a connection string from the individual
// POSTGRES_* parts the integration always seems to provide.
function resolveConnectionString() {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (direct) return direct;

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_DATABASE } = process.env;
  if (POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_HOST) {
    const db = POSTGRES_DATABASE || "postgres";
    return `postgres://${POSTGRES_USER}:${encodeURIComponent(POSTGRES_PASSWORD)}@${POSTGRES_HOST}:5432/${db}`;
  }
  return undefined;
}

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: resolveConnectionString(),
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function query(text, params) {
  return pool.query(text, params);
}

// Runs fn(client) inside BEGIN/COMMIT, ROLLBACK on throw. Use for anything
// that needs the SELECT ... FOR UPDATE row-locking pattern from the PHP
// version (payments/confirm.js, payments/reject.js, rentals/create.js).
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
