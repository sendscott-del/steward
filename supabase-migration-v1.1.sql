-- Migration for v1.1.0
-- Run this in the Supabase SQL Editor

-- Add recurring schedule columns to lsw_behaviors
ALTER TABLE lsw_behaviors
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_pattern JSONB DEFAULT NULL;

-- Remove the 'k' constraint and replace with y/n only
-- First update any existing 'k' entries to 'y'
UPDATE lsw_entries SET value = 'y' WHERE value = 'k';

-- Drop and recreate the check constraint
ALTER TABLE lsw_entries DROP CONSTRAINT IF EXISTS lsw_entries_value_check;
ALTER TABLE lsw_entries ADD CONSTRAINT lsw_entries_value_check CHECK (value IN ('y', 'n'));
