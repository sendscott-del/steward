-- Steward 2.17.0 — Gather user management
--
-- 1. Fix gather_grant_app_access: it was inserting into steward_user_profiles
--    using a non-existent "user_id" column. The table's PK is "id".
-- 2. Add gather_delete_user RPC for fully removing a user from the system.

CREATE OR REPLACE FUNCTION public.gather_grant_app_access(
  p_user_id uuid,
  p_app_name text,
  p_role text DEFAULT 'member'::text,
  p_granted_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_full_name text;
  v_stake_id uuid;
  v_glean_role text;
  v_knit_role text;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.gather_super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'gather_grant_app_access: caller is not a Gather super admin';
  END IF;

  IF p_app_name NOT IN ('magnify', 'steward', 'glean', 'tidings', 'knit') THEN
    RAISE EXCEPTION 'gather_grant_app_access: unknown app %', p_app_name;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_email, v_full_name
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'gather_grant_app_access: user % not found', p_user_id;
  END IF;

  INSERT INTO public.user_apps (user_id, app_name, role, granted_by)
  VALUES (p_user_id, p_app_name, p_role, p_granted_by)
  ON CONFLICT (user_id, app_name) DO UPDATE SET
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    updated_at = now();

  IF p_app_name = 'magnify' THEN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (
      p_user_id,
      v_email,
      v_full_name,
      CASE WHEN p_role IN (
        'stake_president','first_counselor','second_counselor',
        'high_councilor','stake_clerk','exec_secretary'
      ) THEN p_role ELSE 'stake_clerk' END,
      'approved'
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'approved',
      role   = COALESCE(public.profiles.role, EXCLUDED.role);
    v_result := v_result || jsonb_build_object('magnify_profile', 'ensured');

  ELSIF p_app_name = 'steward' THEN
    -- FIX: use "id" (the PK on steward_user_profiles), not "user_id".
    INSERT INTO public.steward_user_profiles (id, email, status)
    VALUES (p_user_id, v_email, 'approved')
    ON CONFLICT (id) DO UPDATE SET status = 'approved';

    IF p_role IN ('admin', 'super_admin') THEN
      INSERT INTO public.steward_admins (user_id)
      VALUES (p_user_id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
    v_result := v_result || jsonb_build_object('steward_profile', 'ensured');

  ELSIF p_app_name = 'glean' THEN
    v_glean_role := CASE p_role
      WHEN 'stake_president' THEN 'stake'
      WHEN 'stake_clerk'     THEN 'clerk'
      WHEN 'bishop'          THEN 'bishop'
      WHEN 'eq_president'    THEN 'eq'
      WHEN 'rs_president'    THEN 'rs'
      ELSE NULL
    END;
    SELECT id INTO v_stake_id FROM public.glean_stakes ORDER BY created_at LIMIT 1;
    IF v_glean_role IS NOT NULL AND v_stake_id IS NOT NULL THEN
      INSERT INTO public.glean_leaders (user_id, email, full_name, role, stake_id)
      VALUES (p_user_id, v_email, v_full_name, v_glean_role, v_stake_id)
      ON CONFLICT (user_id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = COALESCE(public.glean_leaders.full_name, EXCLUDED.full_name);
      v_result := v_result || jsonb_build_object('glean_leader', 'ensured');
    ELSE
      v_result := v_result || jsonb_build_object('glean_leader', 'skipped — no matching role/stake');
    END IF;

  ELSIF p_app_name = 'knit' THEN
    v_knit_role := CASE p_role
      WHEN 'stake_president'     THEN 'stake_president'
      WHEN 'stake_missionary_hc' THEN 'stake_missionary_hc'
      WHEN 'ward_mission_leader' THEN 'ward_mission_leader'
      ELSE NULL
    END;
    SELECT id INTO v_stake_id FROM public.knit_stakes ORDER BY created_at LIMIT 1;
    IF v_knit_role IS NOT NULL AND v_stake_id IS NOT NULL THEN
      INSERT INTO public.knit_admin_users (id, email, name, role, stake_id)
      VALUES (p_user_id, v_email, v_full_name, v_knit_role::text, v_stake_id)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name  = COALESCE(public.knit_admin_users.name, EXCLUDED.name),
        role  = EXCLUDED.role;
      v_result := v_result || jsonb_build_object('knit_admin', 'ensured');
    ELSE
      v_result := v_result || jsonb_build_object('knit_admin', 'skipped — no matching role/stake');
    END IF;

  ELSIF p_app_name = 'tidings' THEN
    v_result := v_result || jsonb_build_object('tidings_profile', 'skipped — separate project');
  END IF;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gather_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.gather_super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'gather_delete_user: caller is not a Gather super admin';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'gather_delete_user: cannot delete yourself';
  END IF;

  DELETE FROM public.user_apps           WHERE user_id = p_user_id;
  DELETE FROM public.gather_super_admins WHERE user_id = p_user_id;
  DELETE FROM public.profiles            WHERE id = p_user_id;
  DELETE FROM public.steward_user_profiles WHERE id = p_user_id;
  DELETE FROM public.steward_admins      WHERE user_id = p_user_id;
  DELETE FROM public.glean_leaders       WHERE user_id = p_user_id;
  DELETE FROM public.knit_admin_users    WHERE id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('deleted', p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.gather_delete_user(uuid) TO authenticated;
