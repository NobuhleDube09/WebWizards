const { Client } = require('pg');
require('dotenv').config();

const poolerUrl = 'postgresql://postgres.blqquepfaagksylisles:MangiZungu%4012345@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const res = await client.query(
    'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1',
    ['categories']
  );
  console.log('categories columns:');
  res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`));
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
