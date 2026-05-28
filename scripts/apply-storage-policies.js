// Applies storage RLS policies using the Supabase service role via REST API
// Run: node scripts/apply-storage-policies.js
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const statements = [
  `DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects`,
  `DROP POLICY IF EXISTS "listings_public_read" ON storage.objects`,
  `DROP POLICY IF EXISTS "avatars_auth_upload"  ON storage.objects`,
  `DROP POLICY IF EXISTS "listings_auth_upload" ON storage.objects`,
  `CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars')`,
  `CREATE POLICY "listings_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'listings')`,
  `CREATE POLICY "avatars_auth_upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars'  AND auth.role() = 'authenticated')`,
  `CREATE POLICY "listings_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated')`,
  `CREATE POLICY "avatars_auth_update"  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars'  AND auth.uid()::text = (storage.foldername(name))[1])`,
  `CREATE POLICY "listings_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1])`,
];

async function runQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  // We'll use the pg-compatible approach via direct DB REST query endpoint
  return res;
}

// Use Supabase's direct SQL execution via Management API (needs service role)
async function execSql(sql) {
  // Supabase exposes a SQL execution endpoint via the service role
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

(async () => {
  console.log('Applying storage policies...\n');
  for (const stmt of statements) {
    try {
      await execSql(stmt);
      console.log(`✓  ${stmt.slice(0, 70)}`);
    } catch (err) {
      // Ignore "already exists" errors, log others
      const msg = String(err);
      if (msg.includes('already exists')) {
        console.log(`~  (already exists) ${stmt.slice(0, 60)}`);
      } else {
        console.error(`✗  ${stmt.slice(0, 60)}\n   ${msg}`);
      }
    }
  }
  console.log('\nDone.');
})();
