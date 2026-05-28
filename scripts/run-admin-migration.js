const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolerUrl = 'postgresql://postgres.blqquepfaagksylisles:MangiZungu%4012345@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

const sqlFile = path.join(__dirname, '..', 'migrations', 'admin-features.sql');
const raw = fs.readFileSync(sqlFile, 'utf8');

// Strip single-line comments, then split on semicolons
const stripped = raw
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

const statements = stripped
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

(async () => {
  await client.connect();
  console.log(`Connected. Running ${statements.length} statements from admin-features migration…\n`);

  let ok = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 90);
    try {
      await client.query(stmt);
      console.log(`  ✅  ${preview}`);
      ok++;
    } catch (e) {
      console.error(`  ❌  ${preview}\n     → ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  await client.end();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

