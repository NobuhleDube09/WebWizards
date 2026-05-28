/**
 * repair-profiles.js
 * Re-creates public.users rows for any Supabase Auth user that
 * doesn't have a profile row. Marks the first user (or the one
 * whose email you specify via ADMIN_EMAIL env var) as is_admin=true.
 *
 * Usage:
 *   node scripts/repair-profiles.js
 *   ADMIN_EMAIL=you@wsu.ac.za node scripts/repair-profiles.js
 */
const { createClient } = require('@supabase/supabase-js');
const { Client }       = require('pg');
require('dotenv').config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const poolerUrl = 'postgresql://postgres.blqquepfaagksylisles:MangiZungu%4012345@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pg = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await pg.connect();
  console.log('Connected to DB.\n');

  // Fetch all Supabase Auth users (up to 1000)
  const { data: { users: authUsers }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) { console.error('Failed to list auth users:', error.message); process.exit(1); }

  console.log(`Found ${authUsers.length} auth user(s):\n`);
  authUsers.forEach(u => console.log(`  ${u.email}  (id: ${u.id})`));
  console.log('');

  let repairedCount = 0;

  for (const authUser of authUsers) {
    // Check if profile row already exists
    const existing = await pg.query('SELECT id FROM users WHERE id = $1', [authUser.id]);
    if (existing.rowCount > 0) {
      console.log(`  ⏭  ${authUser.email} — profile already exists`);
      continue;
    }

    const isAdmin = ADMIN_EMAIL
      ? authUser.email === ADMIN_EMAIL
      : repairedCount === 0; // first user becomes admin if no email specified

    try {
      await pg.query(
        `INSERT INTO users (id, email, name, faculty, year_of_study, is_verified, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          authUser.id,
          authUser.email,
          authUser.user_metadata?.name || authUser.email.split('@')[0],
          authUser.user_metadata?.faculty || 'Unknown Faculty',
          authUser.user_metadata?.year_of_study || 1,
          true,   // treat all as verified (they already logged in before)
          isAdmin,
        ]
      );
      console.log(`  ✅  ${authUser.email} — profile created${isAdmin ? ' (IS_ADMIN=true)' : ''}`);
      repairedCount++;
    } catch (e) {
      console.error(`  ❌  ${authUser.email} — ${e.message}`);
    }
  }

  console.log(`\nDone. ${repairedCount} profile(s) repaired.`);
  await pg.end();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
