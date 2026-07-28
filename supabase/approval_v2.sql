-- Update _execute_approval: handle parent children array + set needs_welcome flag
CREATE OR REPLACE FUNCTION public._execute_approval(p_user_id uuid, p_meta jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_student_id uuid;
  v_child jsonb;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  UPDATE profiles SET role = p_meta->>'intended_role', metadata = p_meta || '{"needs_welcome": true}' WHERE id = p_user_id;

  IF p_meta->>'intended_role' = 'student' THEN
    INSERT INTO students (name, class, grade)
      VALUES (v_profile.name, p_meta->>'class', p_meta->>'grade')
      RETURNING id INTO v_student_id;
    INSERT INTO user_student_links (user_email, student_id, relationship)
      VALUES (v_profile.email, v_student_id, 'self');
    UPDATE students SET user_id = p_user_id WHERE id = v_student_id;
  END IF;

  IF p_meta->>'intended_role' = 'parent' THEN
    -- Handle children array (new format)
    IF p_meta ? 'children' THEN
      FOR v_child IN SELECT * FROM jsonb_array_elements(p_meta->'children')
      LOOP
        SELECT id INTO v_student_id FROM students
          WHERE name ILIKE v_child->>'name' AND class = v_child->>'class' LIMIT 1;
        IF FOUND THEN
          INSERT INTO user_student_links (user_email, student_id, relationship)
            VALUES (v_profile.email, v_student_id, 'parent');
        END IF;
      END LOOP;
    ELSE
      -- Backward compat: single child_name/child_class
      SELECT id INTO v_student_id FROM students
        WHERE name ILIKE p_meta->>'child_name' AND class = p_meta->>'child_class' LIMIT 1;
      IF FOUND THEN
        INSERT INTO user_student_links (user_email, student_id, relationship)
          VALUES (v_profile.email, v_student_id, 'parent');
      END IF;
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
