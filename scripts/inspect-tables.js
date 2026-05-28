const { Client } = require('pg');
require('dotenv').config();

const poolerUrl = 'postgresql://postgres.blqquepfaagksylisles:MangiZungu%4012345@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  // List all tables
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  // Check announcements columns if it exists
  const hasAnn = tables.rows.some(r => r.table_name === 'announcements');
  if (hasAnn) {
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'announcements'"
    );
    console.log('announcements columns:', cols.rows.map(r => r.column_name).join(', '));
  } else {
    console.log('announcements table does NOT exist');
  }

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
