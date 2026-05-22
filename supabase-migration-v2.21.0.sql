-- Steward 2.21.0 — Add stake_clerk as a recognized stake_role
--
-- Until now, steward_user_profiles.stake_role only allowed the four
-- presidency-circle roles (stake_president, first_counselor,
-- second_counselor, exec_secretary). The Stake Clerk has comparable
-- administrative reach (records, transactions, interview scheduling) and
-- needs the same access to the /interviews report.
--
-- This migration:
--   1. Adds 'stake_clerk' to the stake_role CHECK constraint.
--   2. Updates steward_caller_can_manage_interviews() to grant the same
--      RLS access to stake_clerk as the other four roles.

-- 1. Expand the CHECK constraint
ALTER TABLE steward_user_profiles
  DROP CONSTRAINT IF EXISTS steward_user_profiles_stake_role_check;

ALTER TABLE steward_user_profiles
  ADD CONSTRAINT steward_user_profiles_stake_role_check
  CHECK (stake_role IN (
    'stake_president',
    'first_counselor',
    'second_counselor',
    'exec_secretary',
    'stake_clerk'
  ));

-- 2. Update the interview-access helper to include stake_clerk
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
          'exec_secretary',
          'stake_clerk'
        )
    );
$$;

GRANT EXECUTE ON FUNCTION steward_caller_can_manage_interviews() TO authenticated;
