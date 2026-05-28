-- ================================================================
-- CampusConnect — Admin Features Migration
-- Run every statement in Supabase SQL Editor
-- ================================================================

-- 1. Listing moderation status
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
UPDATE listings SET status = 'approved' WHERE status IS NULL;
ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. User suspension
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 3. Categories table — add new columns to the existing table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Seed default categories if none exist
INSERT INTO categories (name, slug, icon, display_order) VALUES
  ('Tutoring',      'tutoring',      '📚', 1),
  ('Creative Arts', 'creative-arts', '🎨', 2),
  ('Tech Support',  'tech-support',  '💻', 3),
  ('Food & Baking', 'food-baking',   '🍞', 4),
  ('Photography',   'photography',   '📸', 5),
  ('Hair & Beauty', 'hair-beauty',   '💄', 6),
  ('Music',         'music',         '🎵', 7),
  ('Fitness',       'fitness',       '🏋️', 8),
  ('Writing',       'writing',       '✍️', 9),
  ('Other',         'other',         '✨', 10)
ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;

-- 4. Announcements table — add admin-needed columns to existing table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enhance moderation_flags for richer reports
ALTER TABLE moderation_flags ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE moderation_flags ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'content';
ALTER TABLE moderation_flags ADD COLUMN IF NOT EXISTS action_taken TEXT;
ALTER TABLE moderation_flags ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE moderation_flags ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
