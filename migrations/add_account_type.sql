-- Add account_type column to distinguish buyers from sellers
-- Existing users default to 'seller' so they keep all existing permissions

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'seller'
    CHECK (account_type IN ('buyer', 'seller'));
