-- Migration for v1.9.0: Allow 'na' value in entries
-- Run this in the Supabase SQL Editor

ALTER TABLE lsw_entries DROP CONSTRAINT IF EXISTS lsw_entries_value_check;
ALTER TABLE lsw_entries ADD CONSTRAINT lsw_entries_value_check CHECK (value IN ('y', 'n', 'na'));
