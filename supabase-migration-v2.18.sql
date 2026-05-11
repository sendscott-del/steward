-- Steward 2.18.0 — Quarterly Interview Summary
--
-- 1. Add a stake_role column to steward_user_profiles so the app can
--    gate the new /interviews page (and the home-page card) on whether
--    the signed-in user is a member of the stake presidency or the
--    stake executive secretary.
--
-- 2. Create steward_interviews — one row per (interviewee, year, quarter).
--    The presidency and executive secretary all read/write the same rows;
--    each row carries an assigned_to_user_id so each presidency member's
--    home page can show "my" interviews for the current quarter.
--
-- The 'new' status value is added to the existing CHECK constraint so a
-- profile created up front (e.g. by an admin assigning a role) does not
-- conflict with the existing useAuth flow.

-- 1. stake_role column (nullable; null = no special access)
ALTER TABLE steward_user_profiles
  ADD COLUMN IF NOT EXISTS stake_role TEXT
  CHECK (stake_role IN (
    'stake_president',
    'first_counselor',
    'second_counselor',
    'exec_secretary'
  ));

-- 2. Interviews table
CREATE TABLE IF NOT EXISTS steward_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- who is being interviewed
  interviewee_name TEXT NOT NULL,
  interviewee_calling TEXT,                -- e.g. "Bishop, Wilmette Ward"

  -- which presidency member owns this interview for this quarter
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- which quarter
  year INTEGER NOT NULL,
  quarter_num INTEGER NOT NULL CHECK (quarter_num BETWEEN 1 AND 4),

  -- status
  scheduled_for DATE,
  completed_at DATE,                       -- null = not yet done
  notes TEXT,

  -- audit
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- one row per person per quarter
  UNIQUE (interviewee_name, year, quarter_num)
);

CREATE INDEX IF NOT EXISTS idx_steward_interviews_year_quarter
  ON steward_interviews (year, quarter_num);

CREATE INDEX IF NOT EXISTS idx_steward_interviews_assigned
  ON steward_interviews (assigned_to_user_id, year, quarter_num);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION steward_interviews_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_steward_interviews_touch ON steward_interviews;
CREATE TRIGGER trg_steward_interviews_touch
  BEFORE UPDATE ON steward_interviews
  FOR EACH ROW
  EXECUTE FUNCTION steward_interviews_touch_updated_at();

-- RLS: only the four privileged roles (or admins) can read/write.
ALTER TABLE steward_interviews ENABLE ROW LEVEL SECURITY;

-- Helper: does the caller have a privileged role (or is an admin)?
CREATE OR REPLACE FUNCTION steward_caller_can_manage_interviews()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM steward_admins WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM steward_user_profiles
      WHERE id = auth.uid()
        AND stake_role IN (
          'stake_president',
          'first_counselor',
          'second_counselor',
          'exec_secretary'
        )
    );
$$;

DROP POLICY IF EXISTS "interviews_select" ON steward_interviews;
CREATE POLICY "interviews_select"
  ON steward_interviews FOR SELECT
  USING (steward_caller_can_manage_interviews());

DROP POLICY IF EXISTS "interviews_insert" ON steward_interviews;
CREATE POLICY "interviews_insert"
  ON steward_interviews FOR INSERT
  WITH CHECK (steward_caller_can_manage_interviews());

DROP POLICY IF EXISTS "interviews_update" ON steward_interviews;
CREATE POLICY "interviews_update"
  ON steward_interviews FOR UPDATE
  USING (steward_caller_can_manage_interviews())
  WITH CHECK (steward_caller_can_manage_interviews());

DROP POLICY IF EXISTS "interviews_delete" ON steward_interviews;
CREATE POLICY "interviews_delete"
  ON steward_interviews FOR DELETE
  USING (steward_caller_can_manage_interviews());

GRANT EXECUTE ON FUNCTION steward_caller_can_manage_interviews() TO authenticated;
