-- Migration for v1.5.0: New frequency model
-- Run this in the Supabase SQL Editor

-- Add new columns
ALTER TABLE lsw_behaviors
  ADD COLUMN IF NOT EXISTS repeat_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_unit TEXT NOT NULL DEFAULT 'day'
    CHECK (repeat_unit IN ('day', 'week', 'month'));

-- Migrate existing data from old frequency column
UPDATE lsw_behaviors SET repeat_unit = 'day', repeat_interval = 1 WHERE frequency = 'daily';
UPDATE lsw_behaviors SET repeat_unit = 'week', repeat_interval = 1 WHERE frequency = 'weekly';
UPDATE lsw_behaviors SET repeat_unit = 'month', repeat_interval = 1 WHERE frequency = 'monthly';
UPDATE lsw_behaviors SET repeat_unit = 'month', repeat_interval = 3 WHERE frequency = 'quarterly';

-- Also add to template behaviors
ALTER TABLE lsw_template_behaviors
  ADD COLUMN IF NOT EXISTS repeat_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_unit TEXT NOT NULL DEFAULT 'day'
    CHECK (repeat_unit IN ('day', 'week', 'month'));
