-- Steward 2.18.3 — Bidirectional sync between personal tracker and the
-- shared Quarterly Interviews report.
--
-- Two AFTER triggers keep steward_entries (each presidency member's
-- personal tracker) and steward_interviews (the cross-presidency
-- report) in lockstep. Either side can be the entry point — a write
-- on one immediately reflects on the other within the same
-- transaction. pg_trigger_depth() guards against infinite recursion.

-- ─── Trigger A: steward_entries → steward_interviews ─────────────────
--
-- Fires when a personal-tracker entry changes. If the related behavior
-- is a quarterly interview (frequency='quarterly' and name LIKE 'Interview %'),
-- mirror the new value to the matching steward_interviews row.

CREATE OR REPLACE FUNCTION steward_sync_entry_to_interview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_behavior steward_behaviors%ROWTYPE;
  v_interviewee_name TEXT;
  v_year INT;
  v_quarter INT;
  v_target_date DATE;
  v_source_date DATE;
BEGIN
  -- Don't recurse: if our partner trigger started this chain, stop here.
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_source_date := COALESCE(NEW.entry_date, OLD.entry_date);

  SELECT * INTO v_behavior
  FROM steward_behaviors
  WHERE id = COALESCE(NEW.behavior_id, OLD.behavior_id);

  IF v_behavior.id IS NULL
     OR v_behavior.frequency <> 'quarterly'
     OR v_behavior.name NOT LIKE 'Interview %' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_interviewee_name := TRIM(SUBSTRING(v_behavior.name FROM 10));
  v_year             := EXTRACT(YEAR  FROM v_source_date)::INT;
  v_quarter          := (FLOOR((EXTRACT(MONTH FROM v_source_date)::INT - 1) / 3) + 1)::INT;

  -- 'y' means done; 'n', 'na', or DELETE means not done.
  IF TG_OP = 'DELETE' THEN
    v_target_date := NULL;
  ELSIF NEW.value = 'y' THEN
    v_target_date := NEW.entry_date;
  ELSE
    v_target_date := NULL;
  END IF;

  UPDATE steward_interviews
  SET completed_at    = v_target_date,
      last_updated_by = v_behavior.user_id,
      updated_at      = now()
  WHERE interviewee_name = v_interviewee_name
    AND year             = v_year
    AND quarter_num      = v_quarter
    AND completed_at IS DISTINCT FROM v_target_date;  -- skip no-op writes

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_steward_entry_to_interview ON steward_entries;
CREATE TRIGGER trg_steward_entry_to_interview
  AFTER INSERT OR UPDATE OR DELETE ON steward_entries
  FOR EACH ROW
  EXECUTE FUNCTION steward_sync_entry_to_interview();


-- ─── Trigger B: steward_interviews → steward_entries ─────────────────
--
-- Fires when a Quarterly Interviews row's completed_at changes. Writes
-- the value into the assigned user's personal tracker against the
-- matching "Interview <name>" behavior, on the quarter start date.
-- If the assigned user doesn't have a matching personal behavior
-- (e.g. an exec sec who hasn't applied a presidency template), the
-- trigger is a no-op — nothing to sync into.

CREATE OR REPLACE FUNCTION steward_sync_interview_to_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_behavior_id UUID;
  v_entry_date  DATE;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_to_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only act on completed_at changes (not on create/edit metadata changes).
  IF TG_OP = 'UPDATE'
     AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_behavior_id
  FROM steward_behaviors
  WHERE user_id   = NEW.assigned_to_user_id
    AND frequency = 'quarterly'
    AND name      = 'Interview ' || NEW.interviewee_name
    AND NOT is_archived
  LIMIT 1;

  IF v_behavior_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_date := make_date(NEW.year, (NEW.quarter_num - 1) * 3 + 1, 1);

  IF NEW.completed_at IS NOT NULL THEN
    INSERT INTO steward_entries (user_id, behavior_id, entry_date, value)
    VALUES (NEW.assigned_to_user_id, v_behavior_id, v_entry_date, 'y')
    ON CONFLICT (behavior_id, entry_date) DO UPDATE
      SET value      = 'y',
          updated_at = now()
      WHERE steward_entries.value IS DISTINCT FROM 'y';
  ELSE
    DELETE FROM steward_entries
    WHERE behavior_id = v_behavior_id
      AND entry_date  = v_entry_date
      AND value       = 'y';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_steward_interview_to_entry ON steward_interviews;
CREATE TRIGGER trg_steward_interview_to_entry
  AFTER INSERT OR UPDATE ON steward_interviews
  FOR EACH ROW
  EXECUTE FUNCTION steward_sync_interview_to_entry();
