-- Steward v2.34.2 — security hardening (applied to shared Supabase isoget… 2026-06-12)
--
-- Context: steward_user_profiles.stake_role is self-selected by users during
-- onboarding (PickCalling). The interview-authority helper trusted that column,
-- so any user could set stake_role='stake_president' and gain read/write on the
-- confidential steward_interviews table. Likewise the self-update RLS policy +
-- column grants let a user set their own status='approved'.
--
-- Fix 1: interview authority derives only from admin-controlled sources
--        (steward_admins) and Gather-controlled roles (gather_user_roles).
-- Fix 2: a BEFORE UPDATE guard reverts status->'approved' unless the caller is a
--        steward admin or a Gather super admin. It runs ahead of the existing
--        AFTER trigger (handle_steward_approval), so no app-access row is created
--        on a blocked self-approval.

create or replace function public.steward_caller_can_manage_interviews()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  SELECT
    EXISTS (SELECT 1 FROM steward_admins WHERE user_id = auth.uid())
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
$function$;

create or replace function public.steward_guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and old.status is distinct from 'approved' then
    if not (
      exists (select 1 from steward_admins where user_id = auth.uid())
      or public.gather_access_caller_ok()
    ) then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists steward_guard_profile_escalation_trg on public.steward_user_profiles;
create trigger steward_guard_profile_escalation_trg
  before update on public.steward_user_profiles
  for each row execute function public.steward_guard_profile_escalation();
