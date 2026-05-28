-- Storage RLS policies for avatars and listings buckets
-- Run this in Supabase SQL Editor if not applied via CLI

DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "listings_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_upload"   ON storage.objects;
DROP POLICY IF EXISTS "listings_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "listings_auth_update"  ON storage.objects;

-- Public read access
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "listings_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

-- Authenticated users can upload
CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "listings_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

-- Authenticated users can update their own objects
CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "listings_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
