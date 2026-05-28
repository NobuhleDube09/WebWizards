const { Client } = require('pg');
require('dotenv').config();

const poolerUrl = 'postgresql://postgres.blqquepfaagksylisles:MangiZungu%4012345@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  // How many rows in users table?
  const users = await client.query('SELECT id, email, name, is_admin FROM users LIMIT 20');
  console.log(`\nUsers in public.users (${users.rowCount} rows):`);
  users.rows.forEach(r => console.log(`  ${r.email} | name=${r.name} | is_admin=${r.is_admin} | id=${r.id}`));

  // Check if there's a trigger that creates user rows
  const triggers = await client.query(
    "SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'"
  );
  console.log(`\nTriggers (${triggers.rowCount}):`);
  triggers.rows.forEach(r => console.log(`  ${r.trigger_name} on ${r.event_object_table} (${r.event_manipulation})`));

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
