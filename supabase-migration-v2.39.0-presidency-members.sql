-- Steward v2.39.0 — presidency member lookup for the interview views.
--
-- steward_user_profiles SELECT is self-or-admin only, so a non-admin counselor
-- got an EMPTY member list from the direct table read in useInterviews: the
-- interviews grid showed "Unknown" for every assignee, and the Work tab could
-- not say who completed an interview. This definer function returns the
-- presidency roster to anyone already allowed to manage interviews.
--
-- Applied to shared project isogetmvnpimcmouakeg.

create or replace function steward_presidency_members()
returns table (id uuid, full_name text, email text, stake_role text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.stake_role
  from steward_user_profiles p
  where p.status = 'approved'
    and p.stake_role in (
      'stake_president', 'first_counselor', 'second_counselor',
      'exec_secretary', 'stake_clerk'
    )
    and steward_caller_can_manage_interviews()
  order by coalesce(nullif(p.full_name, ''), p.email);
$$;

revoke all on function steward_presidency_members() from public;
grant execute on function steward_presidency_members() to authenticated;
