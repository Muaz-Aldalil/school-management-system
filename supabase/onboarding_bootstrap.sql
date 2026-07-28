-- ============================================================
-- ONBOARDING BOOTSTRAP RPC
-- Solves the RLS chicken-and-egg problem for first-time admin setup.
-- SECURITY DEFINER bypasses RLS to atomically:
--   1. Create (or reuse) a school
--   2. Link the admin's profile to it
--   3. Create school_settings with admin details
-- ============================================================

CREATE OR REPLACE FUNCTION public.bootstrap_school(
  p_name text,
  p_name_en text DEFAULT '',
  p_address text DEFAULT '',
  p_phone text DEFAULT '',
  p_email text DEFAULT '',
  p_admin_name text DEFAULT '',
  p_admin_phone text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user_id uuid;
  v_school_id uuid;
  v_settings_exists boolean;
  v_result jsonb;
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can bootstrap a school';
  END IF;

  v_user_id := auth.uid();

  -- Check if this admin already has a school assigned
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND school_id IS NOT NULL) THEN
    SELECT school_id INTO v_school_id FROM profiles WHERE id = v_user_id;
    RAISE EXCEPTION 'Admin already has a school assigned (id: %)', v_school_id;
  END IF;

  -- Try to find an existing school with the same name (avoid duplicates)
  SELECT id INTO v_school_id FROM schools WHERE name = p_name LIMIT 1;

  -- Create school if not found
  IF v_school_id IS NULL THEN
    INSERT INTO schools (name, name_en, address, phone, email, currency)
    VALUES (p_name, NULLIF(p_name_en, ''), p_address, p_phone, p_email, 'SDG')
    RETURNING id INTO v_school_id;
  END IF;

  -- Link admin profile to the school
  UPDATE profiles
  SET school_id = v_school_id,
      name = CASE WHEN p_admin_name != '' THEN p_admin_name ELSE name END,
      phone = CASE WHEN p_admin_phone != '' THEN p_admin_phone ELSE phone END
  WHERE id = v_user_id;

  -- Create or update school_settings
  SELECT EXISTS (SELECT 1 FROM school_settings WHERE school_id = v_school_id) INTO v_settings_exists;

  IF v_settings_exists THEN
    UPDATE school_settings SET
      school_name = p_name,
      school_address = p_address,
      school_phone = p_phone,
      admin_name = p_admin_name,
      admin_email = p_email,
      updated_at = now()
    WHERE school_id = v_school_id;
  ELSE
    INSERT INTO school_settings (school_name, school_address, school_phone, admin_name, admin_email, school_id)
    VALUES (p_name, p_address, p_phone, p_admin_name, p_email, v_school_id);
  END IF;

  -- Also update the school's own contact info
  UPDATE schools SET
    address = COALESCE(NULLIF(p_address, ''), address),
    phone = COALESCE(NULLIF(p_phone, ''), phone),
    email = COALESCE(NULLIF(p_email, ''), email),
    updated_at = now()
  WHERE id = v_school_id;

  v_result := jsonb_build_object(
    'school_id', v_school_id,
    'school_name', p_name,
    'success', true
  );

  RETURN v_result;
END;
$fn$;

-- Allow authenticated admins to call this RPC
GRANT EXECUTE ON FUNCTION public.bootstrap_school(text, text, text, text, text, text, text) TO authenticated;
