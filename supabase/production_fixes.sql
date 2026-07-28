-- Migration: production_fixes
-- Sequence: 9 (run AFTER all other migrations)
-- Description: RPCs, TOCTOU fixes, indexes, triggers, FK fixes, column type changes,
--              soft deletes, audit trail, health check RPC

-- ============================================================
-- #1: admin_delete_student RPC
-- ============================================================
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'students')
     AND EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments')
     AND EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades') THEN
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
  END IF;
END $block$;

-- ============================================================
-- #5: Fix complete_registration TOCTOU race (add FOR UPDATE)
-- ============================================================
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations')
     AND EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles') THEN
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
      SELECT * INTO inv FROM public.invitations
      WHERE code = p_code AND NOT used
      FOR UPDATE;

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
    $fn$;
  END IF;
END $block$;

-- ============================================================
-- #6: Fix approve_pending_user TOCTOU race (add FOR UPDATE)
-- ============================================================
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles')
     AND EXISTS (SELECT 1 FROM pg_class WHERE relname = 'teacher_assignments') THEN
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
  END IF;
END $block$;

-- Fix check_auto_approve TOCTOU race (add FOR UPDATE)
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles') THEN
    CREATE OR REPLACE FUNCTION public.check_auto_approve()
    RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $fn$
    DECLARE
      v_profile record;
    BEGIN
      SELECT * INTO v_profile FROM profiles WHERE id = auth.uid() AND role = 'pending'
      FOR UPDATE;
      IF NOT FOUND THEN RETURN false; END IF;
      IF v_profile.created_at > now() - interval '7 days' THEN RETURN false; END IF;
      IF v_profile.metadata IS NULL OR v_profile.metadata = '{}'::jsonb THEN RETURN false; END IF;

      PERFORM public._execute_approval(auth.uid(), v_profile.metadata);
      RETURN true;
    END;
    $fn$;
  END IF;
END $block$;

-- ============================================================
-- #11: Missing indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON students(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  END IF;
END $block$;
CREATE INDEX IF NOT EXISTS idx_grades_student_subject ON grades(student_id, subject);

-- ============================================================
-- #12: updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_profiles_updated ON profiles;
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'landing_content') THEN
    DROP TRIGGER IF EXISTS tr_landing_updated ON landing_content;
    CREATE TRIGGER tr_landing_updated BEFORE UPDATE ON landing_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $block$;

DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'school_settings') THEN
    DROP TRIGGER IF EXISTS tr_settings_updated ON school_settings;
    CREATE TRIGGER tr_settings_updated BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $block$;

-- ============================================================
-- #13: Fix invitations FKs — ON DELETE SET NULL
-- ============================================================
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations') THEN
    ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_used_by_fkey;
    ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_created_by_fkey;
    ALTER TABLE invitations ADD CONSTRAINT invitations_used_by_fkey
      FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE invitations ADD CONSTRAINT invitations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $block$;

-- ============================================================
-- #14: Change payments.due_date from text to date
-- ============================================================
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments') THEN
    ALTER TABLE payments ALTER COLUMN due_date TYPE date USING due_date::date;
  END IF;
END $block$;

-- ============================================================
-- #29: Soft deletes
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ============================================================
-- #31: Audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin audit read" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System audit insert" ON audit_log FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS tr_audit_students ON students;
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'students') THEN
    CREATE TRIGGER tr_audit_students AFTER INSERT OR UPDATE OR DELETE ON students FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;
END $block$;

DROP TRIGGER IF EXISTS tr_audit_grades ON grades;
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades') THEN
    CREATE TRIGGER tr_audit_grades AFTER INSERT OR UPDATE OR DELETE ON grades FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;
END $block$;

DROP TRIGGER IF EXISTS tr_audit_payments ON payments;
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments') THEN
    CREATE TRIGGER tr_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;
END $block$;

DROP TRIGGER IF EXISTS tr_audit_profiles ON profiles;
CREATE TRIGGER tr_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================
-- #32: Health check RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.ping()
RETURNS text
LANGUAGE sql SECURITY DEFINER
AS $fn$
  SELECT 'ok'::text;
$fn$;
