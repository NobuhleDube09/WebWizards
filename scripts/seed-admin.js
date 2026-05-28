/**
 * seed-admin.js
 * Creates the CampusConnect admin account in Supabase.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAIL    = 'admin@campus-connect.co.za';
const ADMIN_PASSWORD = 'Campus@2026';
const ADMIN_NAME     = 'CampusConnect Admin';
const ADMIN_FACULTY  = 'Administration';

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🔍  Checking for existing admin account…');

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, is_admin')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();

  if (existing) {
    if (existing.is_admin) {
      console.log('✅  Admin account already exists — nothing to do.');
    } else {
      // Promote to admin
      const { error } = await supabase
        .from('users')
        .update({ is_admin: true, is_verified: true })
        .eq('id', existing.id);
      if (error) { console.error('❌  Failed to promote user:', error.message); process.exit(1); }
      console.log('✅  Existing account promoted to admin.');
    }
    printCredentials();
    return;
  }

  // 1. Create Supabase Auth user
  console.log('👤  Creating auth user…');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.error('❌  Auth user creation failed:', authError.message);
    process.exit(1);
  }

  // 2. Insert profile row
  console.log('📝  Inserting admin profile…');
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    faculty: ADMIN_FACULTY,
    year_of_study: 1,
    bio: 'Platform administrator.',
    is_verified: true,
    is_admin: true,
  });

  if (profileError) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error('❌  Profile insert failed (auth user rolled back):', profileError.message);
    process.exit(1);
  }

  console.log('✅  Admin account created successfully!\n');
  printCredentials();
}

function printCredentials() {
  console.log('─────────────────────────────────────────');
  console.log('  Admin credentials');
  console.log('  Email   :', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
  console.log('  URL     : /pages/login.html');
  console.log('─────────────────────────────────────────');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
