// Shared Postgres access for every API route.
// DATABASE_URL must be Supabase's *pooled* (pgbouncer, port 6543) connection
// string — serverless functions open many short-lived connections and would
// exhaust Postgres's connection limit against the direct port otherwise.
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
