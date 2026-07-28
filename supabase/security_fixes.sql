-- Security fixes for RPC multi-tenancy
-- Run this in Supabase SQL editor after production_fixes.sql

-- 1. Fix admin_delete_student: add school_id verification
CREATE OR REPLACE FUNCTION public.admin_delete_student(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id
      AND s.school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied: student not in your school';
  END IF;
  DELETE FROM payments WHERE student_id = p_student_id;
  DELETE FROM grades   WHERE student_id = p_student_id;
  DELETE FROM students WHERE id = p_student_id;
END;
$fn$;

-- 2. Fix admin_delete_user: add school_id verification
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id
      AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied: user not in your school';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  DELETE FROM teacher_assignments WHERE teacher_email = v_email;
  DELETE FROM user_student_links WHERE user_email = v_email;
  UPDATE students SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE students SET parent_user_id = NULL WHERE parent_user_id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

-- 3. Fix approve_pending_user: add school_id scoping
CREATE OR REPLACE FUNCTION public.approve_pending_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
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

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id AND role = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found or already approved'; END IF;

  v_meta := v_profile.metadata;
  IF v_meta IS NULL OR v_meta = '{}'::jsonb THEN
    RAISE EXCEPTION 'User has not completed registration';
  END IF;

  IF NOT v_is_admin THEN
    SELECT email INTO v_approver_email FROM auth.users WHERE id = auth.uid();
    SELECT array_agg(class) INTO v_approver_classes FROM teacher_assignments WHERE teacher_email = v_approver_email AND school_id = v_profile.school_id;
    v_intended_class := COALESCE(v_meta->>'class', v_meta->>'child_class');
    IF v_intended_class IS NULL OR NOT (v_intended_class = ANY(v_approver_classes)) THEN
      RAISE EXCEPTION 'You can only approve students in your assigned classes';
    END IF;
  END IF;

  PERFORM public._execute_approval(p_user_id, v_meta);
  RETURN true;
END;
$fn$;
