// Run: node scripts/setup-storage.js
// Creates storage buckets and applies RLS policies
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { join } = require('path');
const os = require('os');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL       = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── 1. Create / verify storage buckets ──────────────────────────────────────
async function ensureBuckets() {
  const buckets = [
    { id: 'avatars',  fileSizeLimit: 5 * 1024 * 1024,  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    { id: 'listings', fileSizeLimit: 8 * 1024 * 1024,  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  ];

  for (const b of buckets) {
    const { data: existing } = await supabase.storage.getBucket(b.id);
    if (existing) {
      console.log(`  ~ bucket "${b.id}" already exists`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(b.id, {
      public: true,
      fileSizeLimit: b.fileSizeLimit,
      allowedMimeTypes: b.allowedMimeTypes,
    });
    if (error) {
      // "already exists" is fine
      if (error.message.includes('already exist')) {
        console.log(`  ~ bucket "${b.id}" already exists`);
      } else {
        console.error(`  ✗ bucket "${b.id}": ${error.message}`);
      }
    } else {
      console.log(`  ✓ bucket "${b.id}" created`);
    }
  }
}

// ── 2. Apply RLS policies one at a time via CLI ──────────────────────────────
function runSql(sql) {
  const tmp = join(os.tmpdir(), `cc_policy_${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(`supabase db query --db-url "${DB_URL}" --agent=no -f "${tmp}"`, { stdio: 'pipe' });
    return null;
  } catch (e) {
    return (e.stderr || e.stdout || e.message || '').toString();
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

async function applyPolicies() {
  const drops = [
    `DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects`,
    `DROP POLICY IF EXISTS "listings_public_read" ON storage.objects`,
    `DROP POLICY IF EXISTS "avatars_auth_upload"  ON storage.objects`,
    `DROP POLICY IF EXISTS "listings_auth_upload" ON storage.objects`,
    `DROP POLICY IF EXISTS "avatars_auth_delete"  ON storage.objects`,
    `DROP POLICY IF EXISTS "listings_auth_delete" ON storage.objects`,
  ];
  const creates = [
    `CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars')`,
    `CREATE POLICY "listings_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'listings')`,
    `CREATE POLICY "avatars_auth_upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars'  AND auth.role() = 'authenticated')`,
    `CREATE POLICY "listings_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated')`,
    `CREATE POLICY "avatars_auth_delete"  ON storage.objects FOR DELETE USING (bucket_id = 'avatars'  AND auth.uid()::text = (storage.foldername(name))[1])`,
    `CREATE POLICY "listings_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1])`,
  ];

  for (const stmt of [...drops, ...creates]) {
    const err = runSql(stmt);
    const label = stmt.replace(/\s+/g, ' ').slice(0, 72);
    if (err && !err.includes('already exist') && !err.includes('does not exist')) {
      console.error(`  ✗ ${label}\n    ${err.trim().split('\n')[0]}`);
    } else {
      console.log(`  ✓ ${label}`);
    }
  }
}

(async () => {
  console.log('\n── Storage buckets ─────────────────────────────────────────');
  await ensureBuckets();

  console.log('\n── RLS policies ────────────────────────────────────────────');
  if (!DB_URL) {
    console.warn('  ! DATABASE_URL not set — skipping CLI policy application.');
    console.warn('    Run the SQL in migrations/storage_policies.sql via Supabase SQL Editor.');
  } else {
    await applyPolicies();
  }

  console.log('\nDone.\n');
})();
