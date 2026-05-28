-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds OTP verification columns to the users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS otp_code        text,
  ADD COLUMN IF NOT EXISTS otp_expires_at  timestamptz;
