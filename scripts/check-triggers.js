require('dotenv').config();
const { Client } = require('pg');

const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
const connStr = `postgresql://postgres.blqquepfaagksylisles:${pass}@${process.env.DB_POOLER_HOST || 'aws-0-eu-west-1.pooler.supabase.com'}:5432/postgres`;

const c = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

c.connect()
  .then(() => c.query(`
    SELECT trigger_name, event_object_schema, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema IN ('auth','public')
    ORDER BY event_object_table
  `))
  .then(r => {
    console.log('Triggers found:', r.rows.length);
    console.log(JSON.stringify(r.rows, null, 2));
    return c.end();
  })
  .catch(e => { console.error(e.message); c.end(); });
