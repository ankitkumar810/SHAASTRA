// backend/db.js
// SHARED FILE — built once (Dev Guide Phase 0, step 6), don't touch after Checkpoint 1.
// Single pg.Pool, raw SQL everywhere, no ORM.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase's pooled connection needs SSL; local Postgres does not.
  // Set PGSSL=false in .env for local dev against a plain local install.
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
