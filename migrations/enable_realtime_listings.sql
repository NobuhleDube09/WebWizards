-- Enable Supabase Realtime for listings updates used on the browse page.
-- Safe to run multiple times.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;