-- Steward v2.22.0 — Suite roles: extend steward_caller_can_manage_interviews
-- to accept the 19-role gather_user_roles catalog.
--
-- Per the Gathered User Access spreadsheet, the Stake Executive Secretary is
-- the role specifically flagged for editing/updating quarterly interviews;
-- the other stake-level admins (SP, two counselors, Stake Clerk, HC) keep
-- their existing access. Backward-compat: the existing steward_admins +
-- steward_user_profiles.stake_role checks stay intact.

CREATE OR REPLACE FUNCTION public.steward_caller_can_manage_interviews()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = 'public'
AS $fn$
  SELECT
    EXISTS (SELECT 1 FROM steward_admins WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM steward_user_profiles
      WHERE id = auth.uid()
        AND stake_role IN (
          'stake_president', 'first_counselor', 'second_counselor',
          'exec_secretary', 'stake_clerk'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.gather_user_roles gur
      JOIN auth.users au ON lower(au.email) = lower(gur.email)
      WHERE au.id = auth.uid()
        AND gur.revoked_at IS NULL
        AND gur.role_key IN (
          'stake_president', 'sp_1st_counselor', 'sp_2nd_counselor',
          'stake_exec_secretary', 'stake_clerk', 'high_councilor'
        )
    );
$fn$;

CREATE OR REPLACE FUNCTION public.steward_is_stake_exec_secretary()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = 'public'
AS $fn$
  SELECT
    EXISTS (
      SELECT 1 FROM steward_user_profiles
      WHERE id = auth.uid() AND stake_role = 'exec_secretary'
    )
    OR EXISTS (
      SELECT 1
      FROM public.gather_user_roles gur
      JOIN auth.users au ON lower(au.email) = lower(gur.email)
      WHERE au.id = auth.uid()
        AND gur.role_key = 'stake_exec_secretary'
        AND gur.revoked_at IS NULL
    );
$fn$;
