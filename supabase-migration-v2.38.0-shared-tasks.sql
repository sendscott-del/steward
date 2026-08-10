-- Steward v2.38.0 — Shared tasks
--
-- A behavior can be shared with other Steward users. Every participant keeps
-- their OWN steward_behaviors row, so the task still appears in their own grid,
-- inside their own category, and counts toward their own compliance. The rows
-- are linked by shared_task_id.
--
-- Marking a shared task done fans the value out to every participant's row for
-- that period, stamped with completed_by so the grid can show who did it.
-- Reads are unchanged: each user still reads only their own entries.
--
-- All cross-user writes go through SECURITY DEFINER functions below, because
-- steward_behaviors / steward_categories / steward_entries RLS is strictly
-- "auth.uid() = user_id".

-- ─────────────────────────── schema ───────────────────────────

create table if not exists steward_shared_tasks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table steward_behaviors
  add column if not exists shared_task_id uuid
  references steward_shared_tasks(id) on delete set null;

create index if not exists idx_steward_behaviors_shared_task
  on steward_behaviors (shared_task_id)
  where shared_task_id is not null;

-- Who marked this period done. Null for unshared behaviors.
alter table steward_entries
  add column if not exists completed_by uuid;

alter table steward_shared_tasks enable row level security;

drop policy if exists shared_tasks_select on steward_shared_tasks;
create policy shared_tasks_select on steward_shared_tasks
  for select to authenticated
  using (
    exists (
      select 1 from steward_behaviors b
      where b.shared_task_id = steward_shared_tasks.id
        and b.user_id = (select auth.uid())
    )
  );
-- No insert/update/delete policies: mutations go through the RPCs below.

-- ─────────────────────────── helpers ───────────────────────────

create or replace function steward_caller_is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from steward_admins a where a.user_id = auth.uid())
      or exists (
           select 1 from steward_user_profiles p
           where p.id = auth.uid() and p.status = 'approved'
         );
$$;

-- People this user can share a task with: every other approved Steward user.
-- Needed because steward_user_profiles SELECT is self-or-admin only.
create or replace function steward_shareable_users()
returns table (id uuid, full_name text, email text, stake_role text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.stake_role
  from steward_user_profiles p
  where p.status = 'approved'
    and p.id <> auth.uid()
    and steward_caller_is_approved()
  order by coalesce(nullif(p.full_name, ''), p.email);
$$;

-- ──────────────────── share / unshare a behavior ────────────────────

-- Sets the exact membership of a shared task. Pass an empty array to unshare:
-- every participant keeps their own copy and their own history, just detached.
-- Returns the shared_task_id, or null when unshared.
create or replace function steward_set_behavior_sharing(
  p_behavior_id uuid,
  p_user_ids    uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_beh        steward_behaviors%rowtype;
  v_cat_name   text;
  v_sid        uuid;
  v_targets    uuid[];
  v_target     uuid;
  v_cat_id     uuid;
  v_new_beh_id uuid;
  v_sort       int;
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  select * into v_beh
  from steward_behaviors
  where id = p_behavior_id and user_id = v_caller;

  if not found then
    raise exception 'behavior not found or not yours';
  end if;

  select name into v_cat_name from steward_categories where id = v_beh.category_id;
  v_cat_name := coalesce(nullif(v_cat_name, ''), 'Shared');

  -- Normalize: distinct, non-null, never the caller, approved users only.
  select coalesce(array_agg(distinct u), '{}'::uuid[]) into v_targets
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) as u
  where u is not null
    and u <> v_caller
    and exists (select 1 from steward_user_profiles p where p.id = u and p.status = 'approved');

  -- Nobody selected → tear the group down, non-destructively.
  if coalesce(array_length(v_targets, 1), 0) = 0 then
    if v_beh.shared_task_id is not null then
      update steward_behaviors set shared_task_id = null
       where shared_task_id = v_beh.shared_task_id;
      delete from steward_shared_tasks where id = v_beh.shared_task_id;
    end if;
    return null;
  end if;

  v_sid := v_beh.shared_task_id;
  if v_sid is null then
    insert into steward_shared_tasks (name, created_by)
    values (v_beh.name, v_caller)
    returning id into v_sid;

    update steward_behaviors set shared_task_id = v_sid where id = v_beh.id;
  else
    update steward_shared_tasks
       set name = v_beh.name, updated_at = now()
     where id = v_sid;
  end if;

  -- Members who were deselected keep their copy, detached from the group.
  update steward_behaviors
     set shared_task_id = null, updated_at = now()
   where shared_task_id = v_sid
     and user_id <> v_caller
     and not (user_id = any (v_targets));

  foreach v_target in array v_targets loop
    -- Already in the group: keep their copy in sync with the owner's definition.
    if exists (
      select 1 from steward_behaviors
      where shared_task_id = v_sid and user_id = v_target
    ) then
      update steward_behaviors
         set name        = v_beh.name,
             frequency   = v_beh.frequency,
             "interval"  = v_beh."interval",
             anchor_date = v_beh.anchor_date,
             info_text   = v_beh.info_text,
             is_archived = false,
             updated_at  = now()
       where shared_task_id = v_sid and user_id = v_target;
      continue;
    end if;

    -- Land the task in a same-named category in the member's account,
    -- creating that category if they don't have one.
    select id into v_cat_id
    from steward_categories
    where user_id = v_target and lower(name) = lower(v_cat_name)
    limit 1;

    if v_cat_id is null then
      select coalesce(max(sort_order) + 1, 0) into v_sort
      from steward_categories where user_id = v_target;

      insert into steward_categories (user_id, name, sort_order)
      values (v_target, v_cat_name, v_sort)
      returning id into v_cat_id;
    end if;

    select coalesce(max(sort_order) + 1, 0) into v_sort
    from steward_behaviors where category_id = v_cat_id;

    insert into steward_behaviors (
      user_id, category_id, name, frequency, "interval", anchor_date,
      info_text, sort_order, shared_task_id, is_archived
    )
    values (
      v_target, v_cat_id, v_beh.name, v_beh.frequency, v_beh."interval", v_beh.anchor_date,
      v_beh.info_text, v_sort, v_sid, false
    )
    returning id into v_new_beh_id;

    -- Backfill history from the owner's row so the shared task reads the same
    -- for everyone from day one.
    insert into steward_entries (user_id, behavior_id, entry_date, value, completed_by)
    select v_target, v_new_beh_id, e.entry_date, e.value, coalesce(e.completed_by, v_caller)
    from steward_entries e
    where e.behavior_id = v_beh.id
    on conflict (behavior_id, entry_date) do nothing;
  end loop;

  return v_sid;
end;
$$;

-- ──────────────────── mark a shared task for a period ────────────────────

-- Fans one value out to every participant's row for that period.
-- p_value null clears the period for everyone.
create or replace function steward_set_shared_entry(
  p_shared_task_id uuid,
  p_entry_date     date,
  p_value          text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from steward_behaviors
    where shared_task_id = p_shared_task_id and user_id = v_caller
  ) then
    raise exception 'not a member of this shared task';
  end if;

  if p_value is null then
    delete from steward_entries e
    using steward_behaviors b
    where e.behavior_id = b.id
      and b.shared_task_id = p_shared_task_id
      and e.entry_date = p_entry_date;
    return;
  end if;

  if p_value not in ('y', 'n', 'na') then
    raise exception 'invalid entry value: %', p_value;
  end if;

  insert into steward_entries (user_id, behavior_id, entry_date, value, completed_by, updated_at)
  select b.user_id, b.id, p_entry_date, p_value, v_caller, now()
  from steward_behaviors b
  where b.shared_task_id = p_shared_task_id
  on conflict (behavior_id, entry_date) do update
    set value        = excluded.value,
        completed_by = excluded.completed_by,
        updated_at   = now();
end;
$$;

-- ──────────────────── read: who is in my shared tasks ────────────────────

-- One row per (shared task, participant) for every group the caller belongs to.
-- Drives the "Shared with …" label and resolves completed_by to a name.
create or replace function steward_my_shared_tasks()
returns table (
  shared_task_id uuid,
  member_id      uuid,
  member_name    text,
  is_owner       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select b.shared_task_id,
         b.user_id,
         coalesce(nullif(p.full_name, ''), p.email, 'Someone'),
         (st.created_by = b.user_id)
  from steward_behaviors b
  join steward_shared_tasks st on st.id = b.shared_task_id
  left join steward_user_profiles p on p.id = b.user_id
  where b.shared_task_id in (
    select shared_task_id
    from steward_behaviors
    where user_id = auth.uid() and shared_task_id is not null
  );
$$;

-- ─────────────────────────── grants ───────────────────────────
-- EXECUTE defaults to PUBLIC in Postgres — revoke first, then grant.

revoke all on function steward_caller_is_approved()                     from public;
revoke all on function steward_shareable_users()                        from public;
revoke all on function steward_set_behavior_sharing(uuid, uuid[])       from public;
revoke all on function steward_set_shared_entry(uuid, date, text)       from public;
revoke all on function steward_my_shared_tasks()                        from public;

grant execute on function steward_caller_is_approved()                  to authenticated;
grant execute on function steward_shareable_users()                     to authenticated;
grant execute on function steward_set_behavior_sharing(uuid, uuid[])    to authenticated;
grant execute on function steward_set_shared_entry(uuid, date, text)    to authenticated;
grant execute on function steward_my_shared_tasks()                     to authenticated;
