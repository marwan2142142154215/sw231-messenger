-- Migration: Fix email UNIQUE constraint + add missing columns
-- Run this in Supabase SQL Editor

-- Remove UNIQUE constraint from email (allows anonymous users)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add tracking columns if not exists
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
