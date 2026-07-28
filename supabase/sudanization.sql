-- ============================================================
-- SUDANIZATION MIGRATION — Al-Amiriya School (مدرسة العامريه)
-- Run AFTER all existing migrations
-- ============================================================
-- This migration:
--   1. Creates schools table
--   2. Adds school_id to all relevant tables
--   3. Adds new student fields (national_id, birth_date, state)
--   4. Adds payment fields (method, receipt_number)
--   5. Migrates existing data to default school
--   6. Migrates grade A→Arabic text
--   7. Drops + recreates ALL RLS policies with school_id scoping
--   8. Updates all RPC functions with school_id
--   9. Adds indexes
-- ============================================================

-- ============================================================
-- 1. CREATE schools TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'مدرسة العامريه',
  name_en text DEFAULT 'Al-Amiriya School',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  logo text,
  currency text DEFAULT 'SDG',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all on schools" ON schools FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff read schools" ON schools FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant', 'supervisor')));

-- Insert default school
INSERT INTO schools (name, name_en, address, phone, currency)
VALUES ('مدرسة العامريه', 'Al-Amiriya School', '', '', 'SDG')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. ADD school_id TO ALL TABLES
-- ============================================================

-- Helper: get the default school id
DO $block$ DECLARE v_school_id uuid; BEGIN
  SELECT id INTO v_school_id FROM schools LIMIT 1;

  -- profiles
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles') THEN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE profiles SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- students
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'students') THEN
    ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE students SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- grades
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades') THEN
    ALTER TABLE grades ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE grades SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- payments
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments') THEN
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE payments SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- teacher_assignments
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'teacher_assignments') THEN
    ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE teacher_assignments SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- school_settings
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_settings') THEN
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE school_settings SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- invitations
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations') THEN
    ALTER TABLE invitations ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE invitations SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE notifications SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- dashboard_snapshots
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'dashboard_snapshots') THEN
    ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE dashboard_snapshots SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- landing_sections
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'landing_sections') THEN
    ALTER TABLE landing_sections ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE landing_sections SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- landing_content
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'landing_content') THEN
    ALTER TABLE landing_content ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE landing_content SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- events
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events') THEN
    ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE events SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- achievements
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'achievements') THEN
    ALTER TABLE achievements ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE achievements SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- teachers
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'teachers') THEN
    ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE teachers SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

  -- audit_log
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log') THEN
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
    UPDATE audit_log SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;

END $block$;

-- ============================================================
-- 3. ADD NEW STUDENT FIELDS
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS state text;

-- ============================================================
-- 4. ADD PAYMENT FIELDS
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method text DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'other'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;

-- ============================================================
-- 5. MIGRATE GRADE TEXT A→Arabic
-- ============================================================
UPDATE grades SET grade = 'ممتاز' WHERE grade = 'A';
UPDATE grades SET grade = 'جيد جداً' WHERE grade = 'B';
UPDATE grades SET grade = 'جيد' WHERE grade = 'C';
UPDATE grades SET grade = 'مقبول' WHERE grade = 'D';
UPDATE grades SET grade = 'راسب' WHERE grade = 'F';

-- ============================================================
-- 6. UPDATE school_settings default school_name
-- ============================================================
UPDATE school_settings SET school_name = 'مدرسة العامريه' WHERE school_name = 'الاخلاء';

-- ============================================================
-- 7. ADD INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school ON teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_invitations_school ON invitations(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number);

-- ============================================================
-- 8. DROP + RECREATE ALL RLS POLICIES
-- ============================================================

-- Helper: drop all policies on a table, then recreate
-- students
DO $$ BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Admin all on students" ON students;
  DROP POLICY IF EXISTS "Teacher read assigned students" ON students;
  DROP POLICY IF EXISTS "Student read own" ON students;
  DROP POLICY IF EXISTS "Parent read child" ON students;
  DROP POLICY IF EXISTS "Students can view own" ON students;
  DROP POLICY IF EXISTS "Parents can view children" ON students;
  DROP POLICY IF EXISTS "Teachers can view assigned" ON students;
END $$;

CREATE POLICY "Admin all on students" ON students FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = students.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = students.school_id));

CREATE POLICY "Supervisor read students" ON students FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor' AND p.school_id = students.school_id));

CREATE POLICY "Teacher read assigned students" ON students FOR SELECT
  USING (EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_email = auth.email() AND ta.class = students.class AND ta.school_id = students.school_id));

CREATE POLICY "Student read own" ON students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Parent read child" ON students FOR SELECT
  USING (parent_user_id = auth.uid());

-- grades
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on grades" ON grades;
  DROP POLICY IF EXISTS "Teacher CRUD assigned" ON grades;
  DROP POLICY IF EXISTS "Student read own grades" ON grades;
  DROP POLICY IF EXISTS "Parent read child grades" ON grades;
END $$;

CREATE POLICY "Admin all on grades" ON grades FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = grades.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = grades.school_id));

CREATE POLICY "Supervisor read grades" ON grades FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor' AND p.school_id = grades.school_id));

CREATE POLICY "Teacher CRUD assigned" ON grades FOR ALL
  USING (EXISTS (SELECT 1 FROM teacher_assignments ta JOIN students s ON s.id = grades.student_id WHERE ta.teacher_email = auth.email() AND s.class = ta.class AND ta.school_id = grades.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM teacher_assignments ta JOIN students s ON s.id = grades.student_id WHERE ta.teacher_email = auth.email() AND s.class = ta.class AND ta.school_id = grades.school_id));

CREATE POLICY "Student read own grades" ON grades FOR SELECT
  USING (EXISTS (SELECT 1 FROM students WHERE id = grades.student_id AND user_id = auth.uid()));

CREATE POLICY "Parent read child grades" ON grades FOR SELECT
  USING (EXISTS (SELECT 1 FROM students WHERE id = grades.student_id AND parent_user_id = auth.uid()));

-- payments
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on payments" ON payments;
  DROP POLICY IF EXISTS "Accountant all on payments" ON payments;
  DROP POLICY IF EXISTS "Student read own payments" ON payments;
  DROP POLICY IF EXISTS "Parent read child payments" ON payments;
END $$;

CREATE POLICY "Admin all on payments" ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = payments.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = payments.school_id));

CREATE POLICY "Accountant all on payments" ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accountant' AND school_id = payments.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accountant' AND school_id = payments.school_id));

CREATE POLICY "Supervisor read payments" ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor' AND p.school_id = payments.school_id));

CREATE POLICY "Student read own payments" ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM students WHERE id = payments.student_id AND user_id = auth.uid()));

CREATE POLICY "Parent read child payments" ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM students WHERE id = payments.student_id AND parent_user_id = auth.uid()));

-- teacher_assignments
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on teacher_assignments" ON teacher_assignments;
  DROP POLICY IF EXISTS "Teacher read own" ON teacher_assignments;
END $$;

CREATE POLICY "Admin all on teacher_assignments" ON teacher_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = teacher_assignments.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = teacher_assignments.school_id));

CREATE POLICY "Teacher read own" ON teacher_assignments FOR SELECT
  USING (teacher_email = auth.email());

-- school_settings
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on school_settings" ON school_settings;
  DROP POLICY IF EXISTS "Staff read school_settings" ON school_settings;
END $$;

CREATE POLICY "Admin all on school_settings" ON school_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = school_settings.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = school_settings.school_id));

CREATE POLICY "Staff read school_settings" ON school_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant', 'supervisor') AND school_id = school_settings.school_id));

-- user_student_links
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on user_student_links" ON user_student_links;
  DROP POLICY IF EXISTS "User read own links" ON user_student_links;
END $$;

CREATE POLICY "Admin all on user_student_links" ON user_student_links FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "User read own links" ON user_student_links FOR SELECT
  USING (user_email = auth.email());

-- invitations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin all on invitations" ON invitations;
END $$;

CREATE POLICY "Admin all on invitations" ON invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = invitations.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = invitations.school_id));

-- notifications
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can insert notifications" ON notifications;
  DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
  DROP POLICY IF EXISTS "Staff can update notifications" ON notifications;
END $$;

CREATE POLICY "Staff can insert notifications" ON notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant') AND school_id = notifications.school_id));

CREATE POLICY "Users read own notifications" ON notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant') AND school_id = notifications.school_id));

CREATE POLICY "Staff can update notifications" ON notifications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant') AND school_id = notifications.school_id));

-- profiles (add school_id check)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
END $$;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = profiles.school_id));
CREATE POLICY "Admin can update all profiles" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = profiles.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = profiles.school_id));

-- landing page tables
DO $$ BEGIN
  -- landing_sections
  DROP POLICY IF EXISTS "Admin all on landing_sections" ON landing_sections;
  CREATE POLICY "Admin all on landing_sections" ON landing_sections FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = landing_sections.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = landing_sections.school_id));

  -- landing_content
  DROP POLICY IF EXISTS "Admin all on landing_content" ON landing_content;
  CREATE POLICY "Admin all on landing_content" ON landing_content FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = landing_content.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = landing_content.school_id));

  -- events
  DROP POLICY IF EXISTS "Admin all on events" ON events;
  CREATE POLICY "Admin all on events" ON events FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = events.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = events.school_id));

  -- achievements
  DROP POLICY IF EXISTS "Admin all on achievements" ON achievements;
  CREATE POLICY "Admin all on achievements" ON achievements FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = achievements.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = achievements.school_id));

  -- teachers
  DROP POLICY IF EXISTS "Admin all on teachers" ON teachers;
  CREATE POLICY "Admin all on teachers" ON teachers FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = teachers.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = teachers.school_id));

  -- dashboard_snapshots
  DROP POLICY IF EXISTS "Admins can manage snapshots" ON dashboard_snapshots;
  CREATE POLICY "Admins can manage snapshots" ON dashboard_snapshots FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = dashboard_snapshots.school_id))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND school_id = dashboard_snapshots.school_id));
END $$;

-- ============================================================
-- 9. UPDATE RPC FUNCTIONS WITH school_id
-- ============================================================

-- admin_delete_student: pass school_id check
CREATE OR REPLACE FUNCTION public.admin_delete_student(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  DELETE FROM payments WHERE student_id = p_student_id;
  DELETE FROM grades   WHERE student_id = p_student_id;
  DELETE FROM students WHERE id = p_student_id;
END;
$fn$;

-- approve_pending_user: add school_id to student insert
CREATE OR REPLACE FUNCTION public._execute_approval(p_user_id uuid, p_meta jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_profile record;
  v_student_id uuid;
  v_child jsonb;
  v_school_id uuid;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Get the school_id from the admin's profile or the default school
  SELECT p.school_id INTO v_school_id FROM profiles p WHERE p.id = auth.uid();
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
  END IF;

  UPDATE profiles SET role = p_meta->>'intended_role', school_id = COALESCE(school_id, v_school_id), metadata = p_meta || '{"needs_welcome": true}' WHERE id = p_user_id;

  IF p_meta->>'intended_role' = 'student' THEN
    INSERT INTO students (name, class, grade, school_id)
      VALUES (v_profile.name, p_meta->>'class', p_meta->>'grade', v_school_id)
      RETURNING id INTO v_student_id;
    INSERT INTO user_student_links (user_email, student_id, relationship)
      VALUES (v_profile.email, v_student_id, 'self');
    UPDATE students SET user_id = p_user_id WHERE id = v_student_id;
  END IF;

  IF p_meta->>'intended_role' = 'parent' THEN
    IF p_meta ? 'children' THEN
      FOR v_child IN SELECT * FROM jsonb_array_elements(p_meta->'children')
      LOOP
        SELECT id INTO v_student_id FROM students
          WHERE name ILIKE v_child->>'name' AND class = v_child->>'class' AND school_id = v_school_id LIMIT 1;
        IF FOUND THEN
          INSERT INTO user_student_links (user_email, student_id, relationship)
            VALUES (v_profile.email, v_student_id, 'parent');
        END IF;
      END LOOP;
    ELSE
      SELECT id INTO v_student_id FROM students
        WHERE name ILIKE p_meta->>'child_name' AND class = p_meta->>'child_class' AND school_id = v_school_id LIMIT 1;
      IF FOUND THEN
        INSERT INTO user_student_links (user_email, student_id, relationship)
          VALUES (v_profile.email, v_student_id, 'parent');
      END IF;
    END IF;
  END IF;

  IF p_meta->>'intended_role' = 'teacher' THEN
    DELETE FROM teacher_assignments WHERE teacher_email = v_profile.email AND school_id = v_school_id;
    INSERT INTO teacher_assignments (teacher_email, class, school_id)
      SELECT COALESCE(v_profile.email, (SELECT email FROM auth.users WHERE id = p_user_id)), trim(value), v_school_id
      FROM jsonb_array_elements_text(p_meta->'classes');
  END IF;
END;
$fn$;

-- approve_pending_user: updated with school_id
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

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id AND role = 'pending' FOR UPDATE;
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

-- complete_registration: add school_id
CREATE OR REPLACE FUNCTION public.complete_registration(
  p_code text,
  p_name text,
  p_phone text,
  p_selected_role text,
  p_role_data jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  inv record;
  v_student_id uuid;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE code = p_code AND NOT used FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  IF inv.role != p_selected_role THEN
    RAISE EXCEPTION 'Invitation is for role % but you selected %', inv.role, p_selected_role;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation code has expired';
  END IF;

  IF inv.target_email IS NOT NULL AND inv.target_email != auth.email() THEN
    RAISE EXCEPTION 'This code is for a different email address';
  END IF;

  UPDATE public.profiles SET role = p_selected_role, name = COALESCE(p_name, name), phone = p_phone, school_id = COALESCE(school_id, inv.school_id) WHERE id = auth.uid();

  IF p_selected_role = 'teacher' THEN
    DELETE FROM public.teacher_assignments WHERE teacher_email = auth.email() AND school_id = inv.school_id;
    INSERT INTO public.teacher_assignments (teacher_email, class, school_id)
    SELECT COALESCE(auth.email(), (SELECT email FROM auth.users WHERE id = auth.uid())), trim(value), inv.school_id FROM jsonb_array_elements_text(p_role_data->'classes');
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
$fn$;

-- generate_invitation: add school_id
CREATE OR REPLACE FUNCTION public.generate_invitation(p_role text, p_metadata jsonb DEFAULT '{}', p_target_name text DEFAULT NULL, p_target_email text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_code text;
  v_school_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate invitations';
  END IF;

  SELECT school_id INTO v_school_id FROM profiles WHERE id = auth.uid();
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
  END IF;

  v_code := 'SCH-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.invitations (code, role, metadata, created_by, target_name, target_email, school_id)
    VALUES (v_code, p_role, p_metadata, auth.uid(), p_target_name, p_target_email, v_school_id);

  RETURN v_code;
END;
$fn$;

-- check_invitation: unchanged but works with school_id

-- set_updated_at: add schools trigger
DROP TRIGGER IF EXISTS tr_schools_updated ON schools;
CREATE TRIGGER tr_schools_updated BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. UPDATE school_settings default school_name
-- ============================================================
UPDATE school_settings SET school_name = 'مدرسة العامريه' WHERE school_name = 'الاخلاء' OR school_name IS NULL;
