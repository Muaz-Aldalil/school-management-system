-- Add metadata column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Internal approval logic (bypasses permission checks — called from other functions)
CREATE OR REPLACE FUNCTION public._execute_approval(p_user_id uuid, p_meta jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_student_id uuid;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  UPDATE profiles SET role = p_meta->>'intended_role' WHERE id = p_user_id;

  IF p_meta->>'intended_role' = 'student' THEN
    INSERT INTO students (name, class, grade)
      VALUES (v_profile.name, p_meta->>'class', p_meta->>'grade')
      RETURNING id INTO v_student_id;
    INSERT INTO user_student_links (user_email, student_id, relationship)
      VALUES (v_profile.email, v_student_id, 'self');
    UPDATE students SET user_id = p_user_id WHERE id = v_student_id;
  END IF;

  IF p_meta->>'intended_role' = 'parent' THEN
    SELECT id INTO v_student_id FROM students
      WHERE name ILIKE p_meta->>'child_name' AND class = p_meta->>'child_class' LIMIT 1;
    IF FOUND THEN
      INSERT INTO user_student_links (user_email, student_id, relationship)
        VALUES (v_profile.email, v_student_id, 'parent');
    END IF;
  END IF;

  IF p_meta->>'intended_role' = 'teacher' THEN
    DELETE FROM teacher_assignments WHERE teacher_email = v_profile.email;
    INSERT INTO teacher_assignments (teacher_email, class)
      SELECT COALESCE(v_profile.email, (SELECT email FROM auth.users WHERE id = p_user_id)), trim(value)
      FROM jsonb_array_elements_text(p_meta->'classes');
  END IF;
END;
$$;

-- Admin/teacher approval (permission checking)
CREATE OR REPLACE FUNCTION public.approve_pending_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_meta jsonb;
  v_is_admin boolean;
  v_is_teacher boolean;
  v_approver_classes text[];
  v_approver_email text;
  v_intended_class text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher') INTO v_is_teacher;
  IF NOT v_is_admin AND NOT v_is_teacher THEN
    RAISE EXCEPTION 'Only admins and teachers can approve users';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id AND role = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found or already approved'; END IF;

  v_meta := v_profile.metadata;
  IF v_meta IS NULL OR v_meta = '{}'::jsonb THEN
    RAISE EXCEPTION 'User has not completed registration';
  END IF;

  IF NOT v_is_admin THEN
    SELECT email INTO v_approver_email FROM auth.users WHERE id = auth.uid();
    SELECT array_agg(class) INTO v_approver_classes FROM teacher_assignments WHERE teacher_email = v_approver_email;
    v_intended_class := COALESCE(v_meta->>'class', v_meta->>'child_class');
    IF v_intended_class IS NULL OR NOT (v_intended_class = ANY(v_approver_classes)) THEN
      RAISE EXCEPTION 'You can only approve students in your assigned classes';
    END IF;
  END IF;

  PERFORM public._execute_approval(p_user_id, v_meta);
  RETURN true;
END;
$$;

-- Auto-approve after 7 days (called on login)
CREATE OR REPLACE FUNCTION public.check_auto_approve()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid() AND role = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_profile.created_at > now() - interval '7 days' THEN RETURN false; END IF;
  IF v_profile.metadata IS NULL OR v_profile.metadata = '{}'::jsonb THEN RETURN false; END IF;

  PERFORM public._execute_approval(auth.uid(), v_profile.metadata);
  RETURN true;
END;
$$;
