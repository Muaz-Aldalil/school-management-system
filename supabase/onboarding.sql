-- Invitations (serial numbers for self-registration)
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL DEFAULT 'SCH-' || upper(substr(md5(random()::text), 1, 8)),
  role text NOT NULL CHECK (role IN ('teacher', 'student', 'parent', 'accountant', 'supervisor')),
  metadata jsonb DEFAULT '{}',
  used boolean DEFAULT false,
  used_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',
  used_at timestamptz
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admin CRUD
CREATE POLICY "Admin all on invitations" ON invitations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Check if an invitation code is valid (returns role without consuming it)
CREATE OR REPLACE FUNCTION public.check_invitation(p_code text)
RETURNS TABLE(valid boolean, role text, error text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  inv record;
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

  RETURN QUERY SELECT true, inv.role, NULL::text;
END;
$$;

-- Complete registration: validate code + set role + create assignments/links
CREATE OR REPLACE FUNCTION public.complete_registration(
  p_code text,
  p_name text,
  p_phone text,
  p_selected_role text,
  p_role_data jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  inv record;
  v_student_id uuid;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE code = p_code AND NOT used;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  IF inv.role != p_selected_role THEN
    RAISE EXCEPTION 'Invitation is for role % but you selected %', inv.role, p_selected_role;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation code has expired';
  END IF;

  UPDATE public.profiles SET role = p_selected_role, name = COALESCE(p_name, name), phone = p_phone WHERE id = auth.uid();

  IF p_selected_role = 'teacher' THEN
    DELETE FROM public.teacher_assignments WHERE teacher_email = auth.email();
    INSERT INTO public.teacher_assignments (teacher_email, class)
    SELECT COALESCE(auth.email(), (SELECT email FROM auth.users WHERE id = auth.uid())), trim(value) FROM jsonb_array_elements_text(p_role_data->'classes');
  END IF;

  IF p_selected_role = 'student' THEN
    v_student_id := (inv.metadata->>'student_id')::uuid;
    IF v_student_id IS NOT NULL THEN
      INSERT INTO public.user_student_links (user_email, student_id, relationship)
        VALUES (auth.email(), v_student_id, 'self')
        ON CONFLICT (user_email, student_id) DO NOTHING;
      UPDATE public.students SET user_id = auth.uid() WHERE id = v_student_id;
    END IF;
  END IF;

  IF p_selected_role = 'parent' THEN
    v_student_id := (inv.metadata->>'student_id')::uuid;
    IF v_student_id IS NOT NULL THEN
      INSERT INTO public.user_student_links (user_email, student_id, relationship)
        VALUES (auth.email(), v_student_id, 'parent')
        ON CONFLICT (user_email, student_id) DO NOTHING;
      UPDATE public.students SET parent_user_id = auth.uid() WHERE id = v_student_id;
    END IF;
  END IF;

  UPDATE public.invitations SET used = true, used_by = auth.uid(), used_at = now() WHERE id = inv.id;

  RETURN true;
END;
$$;

-- Generate invitation code (admin only)
CREATE OR REPLACE FUNCTION public.generate_invitation(p_role text, p_metadata jsonb DEFAULT '{}')
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate invitations';
  END IF;

  v_code := 'SCH-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.invitations (code, role, metadata, created_by)
    VALUES (v_code, p_role, p_metadata, auth.uid());

  RETURN v_code;
END;
$$;
