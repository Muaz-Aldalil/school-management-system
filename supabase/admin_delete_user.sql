-- Admin: delete a user (profile + auth + related records)
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
