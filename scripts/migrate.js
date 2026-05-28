

require('dotenv').config();
const { Client } = require('pg');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌  DATABASE_URL is not set.\n');
  console.error('Add it to your .env file:\n');
  console.error(
    '  DATABASE_URL=postgresql://postgres:[YOUR_DB_PASSWORD]@db.blqquepfaagksylisles.supabase.co:5432/postgres\n'
  );
  console.error('Find your password: Supabase dashboard → Settings → Database → Connection string\n');
  process.exit(1);
}

const SQL_FILE = path.join(__dirname, '..', 'supabase-schema.sql');

async function migrate() {
  // Use Session Pooler (IPv4) — direct DB endpoint is IPv6-only
  const password = process.env.DB_PASSWORD || '';
  const poolerHost = process.env.DB_POOLER_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
  const ref = 'blqquepfaagksylisles';
  const encodedPass = encodeURIComponent(password);
  const connStr = `postgresql://postgres.${ref}:${encodedPass}@${poolerHost}:5432/postgres`;
  console.log(`🌐  Using Session Pooler: ${poolerHost}`);

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔌  Connecting to database…');
    await client.connect();
    console.log('✅  Connected.\n');

    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    console.log('�️   Dropping existing tables (clean slate)…');
    await client.query(`
      DROP TABLE IF EXISTS moderation_flags CASCADE;
      DROP TABLE IF EXISTS reviews CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS conversations CASCADE;
      DROP TABLE IF EXISTS listings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅  Tables dropped.\n');

    console.log('�📄  Running supabase-schema.sql…\n');

    await client.query(sql);

    console.log('✅  Migration complete — all tables and indexes are ready.\n');
  } catch (err) {
    console.error('\n❌  Migration failed:\n', err.message, '\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
