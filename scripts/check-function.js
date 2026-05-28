require('dotenv').config();
const { Client } = require('pg');

const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
const connStr = `postgresql://postgres.blqquepfaagksylisles:${pass}@${process.env.DB_POOLER_HOST || 'aws-0-eu-west-1.pooler.supabase.com'}:5432/postgres`;

const c = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

c.connect()
  .then(() => c.query(`
    SELECT prosrc, proname
    FROM pg_proc
    WHERE proname = 'handle_new_user'
  `))
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    return c.end();
  })
  .catch(e => { console.error(e.message); c.end(); });
