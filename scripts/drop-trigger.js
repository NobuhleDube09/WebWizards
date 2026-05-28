require('dotenv').config();
const { Client } = require('pg');

const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
const connStr = `postgresql://postgres.blqquepfaagksylisles:${pass}@${process.env.DB_POOLER_HOST || 'aws-0-eu-west-1.pooler.supabase.com'}:5432/postgres`;

const c = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

c.connect()
  .then(() => {
    console.log('Dropping conflicting trigger and function…');
    return c.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP FUNCTION IF EXISTS handle_new_user();
    `);
  })
  .then(() => {
    console.log('✅  Done — trigger and function removed.');
    return c.end();
  })
  .catch(e => { console.error('❌', e.message); c.end(); });
