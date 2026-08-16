-- fix_signup_pending.sql
-- Goal: un-break self-registration. Symptom: signup returns 500 "Database error
-- saving new user", which the frontend renders as {} (supabase-js masks 5xx).
--
-- Fixes three possible causes of the 500, plus the invitation-code flow so it
-- works when "Confirm email" is enabled (no session exists right after signup):
--
--   1. profiles.role CHECK constraint must allow 'pending'/'accountant'/'supervisor'/'worker'
--   2. handle_new_user must create the profile as 'admin' (first user) or 'pending'
--   3. audit_trigger_fn must not abort signup (make it SECURITY DEFINER)
--   4. Invitation codes are resolved server-side in the signup transaction via
--      _apply_invitation (uses new.email/new.id, NOT auth.email()/auth.uid()).
--   5. check_invitation accepts an optional p_email so email-locked codes can be
--      validated before signup (when there is no session yet).
--
-- Idempotent: safe to run multiple times. Run once in Supabase Dashboard
-- -> SQL Editor against the production project (hmvlhhdeidultsoqmcwp).

-- ============================================================
-- 1. Allow every role used by the app
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'parent', 'student', 'worker', 'pending', 'accountant', 'supervisor'));

-- ============================================================
-- 2. Ensure columns the flow relies on
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS target_name text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS target_email text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- ============================================================
-- 3. Robust audit trigger (must never abort profile writes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

-- ============================================================
-- 4. Invitation resolution helper (runs inside the signup txn)
-- ============================================================
CREATE OR REPLACE FUNCTION public._apply_invitation(
  p_uid uuid,
  p_email text,
  p_meta jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_code text;
  inv record;
  v_student_id uuid;
  v_required_role text := p_meta->>'role';
  v_error text;
BEGIN
  v_code := p_meta->>'serial';
  IF v_code IS NULL OR btrim(v_code) = '' THEN
    RETURN;
  END IF;

  SELECT * INTO inv FROM public.invitations WHERE code = btrim(v_code) FOR UPDATE;

  IF inv.id IS NULL THEN
    v_error := 'Invalid invitation code';
  ELSIF inv.used THEN
    v_error := 'This code has already been used';
  ELSIF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    v_error := 'This code has expired';
  ELSIF inv.target_email IS NOT NULL AND inv.target_email != p_email THEN
    v_error := 'This code is for a different email address';
  ELSIF v_required_role IS NOT NULL AND inv.role != v_required_role THEN
    v_error := 'Invitation is for role ' || inv.role || ' but you selected ' || v_required_role;
  END IF;

  -- Teachers must have a valid code; other roles fall back to pending approval.
  IF v_error IS NOT NULL THEN
    IF v_required_role = 'teacher' THEN
      RAISE EXCEPTION '%', v_error;
    END IF;
    UPDATE public.profiles
       SET metadata = jsonb_build_object('intended_role', 'pending', 'invitation_error', v_error)
     WHERE id = p_uid;
    RETURN;
  END IF;

  UPDATE public.profiles
     SET role = inv.role,
         name = COALESCE(p_meta->>'name', name),
         phone = p_meta->>'phone',
         school_id = COALESCE(school_id, inv.school_id),
         metadata = jsonb_build_object('intended_role', inv.role)
   WHERE id = p_uid;

  IF inv.role = 'teacher' THEN
    DELETE FROM public.teacher_assignments
      WHERE teacher_email = p_email AND school_id = inv.school_id;
    INSERT INTO public.teacher_assignments (teacher_email, class, school_id)
    SELECT p_email, trim(value), inv.school_id
      FROM jsonb_array_elements_text(COALESCE(p_meta->'classes', '[]'::jsonb));
  END IF;

  IF inv.role = 'student' THEN
    v_student_id := (inv.metadata->>'student_id')::uuid;
    IF v_student_id IS NOT NULL THEN
      INSERT INTO public.user_student_links (user_email, student_id, relationship)
        VALUES (p_email, v_student_id, 'self')
        ON CONFLICT (user_email, student_id) DO NOTHING;
      UPDATE public.students SET user_id = p_uid WHERE id = v_student_id;
    END IF;
  END IF;

  IF inv.role = 'parent' THEN
    v_student_id := (inv.metadata->>'student_id')::uuid;
    IF v_student_id IS NOT NULL THEN
      INSERT INTO public.user_student_links (user_email, student_id, relationship)
        VALUES (p_email, v_student_id, 'parent')
        ON CONFLICT (user_email, student_id) DO NOTHING;
      UPDATE public.students SET parent_user_id = p_uid WHERE id = v_student_id;
    END IF;
  END IF;

  UPDATE public.invitations SET used = true, used_by = p_uid, used_at = now() WHERE id = inv.id;
END;
$fn$;

-- ============================================================
-- 5. handle_new_user: first user = admin, else pending; resolve
--    invitation code and capture signup metadata for approval.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_role text;
  v_meta jsonb;
BEGIN
  v_role := 'pending';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    v_role := 'admin';
  END IF;

  v_meta := jsonb_build_object(
    'intended_role', COALESCE(new.raw_user_meta_data->>'role', 'pending'),
    'name', new.raw_user_meta_data->>'name',
    'phone', new.raw_user_meta_data->>'phone',
    'classes', COALESCE(new.raw_user_meta_data->'classes', '[]'::jsonb),
    'class', new.raw_user_meta_data->>'class',
    'grade', new.raw_user_meta_data->>'grade',
    'children', COALESCE(new.raw_user_meta_data->'children', '[]'::jsonb)
  );

  INSERT INTO public.profiles (id, email, name, role, metadata)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_role,
    v_meta
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    metadata = EXCLUDED.metadata;

  PERFORM public._apply_invitation(new.id, new.email, new.raw_user_meta_data);

  RETURN new;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. check_invitation: optional p_email (validates email-locked
--    codes before signup, when there is no session yet).
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_invitation(p_code text, p_email text DEFAULT NULL)
RETURNS TABLE(valid boolean, role text, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  inv record;
  v_email text := COALESCE(p_email, auth.email());
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE code = p_code;

  IF inv.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'Invalid invitation code'::text; RETURN;
  END IF;

  IF inv.used THEN
    RETURN QUERY SELECT false, NULL::text, 'This code has already been used'::text; RETURN;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::text, 'This code has expired'::text; RETURN;
  END IF;

  IF inv.target_email IS NOT NULL
     AND v_email IS NOT NULL
     AND inv.target_email != v_email THEN
    RETURN QUERY SELECT false, NULL::text, 'This code is for a different email address'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, inv.role, NULL::text;
END;
$fn$;
