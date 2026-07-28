-- Migration: move students, grades, payments from localStorage to Supabase

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class text NOT NULL,
  grade text NOT NULL,
  email text,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  parent text,
  phone text,
  photo text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  grade text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  due_date text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Teacher assignments (which classes a teacher can edit)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_email text NOT NULL,
  class text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_email, class)
);

-- School settings (single row)
CREATE TABLE IF NOT EXISTS school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text DEFAULT 'الاخلاء',
  school_address text DEFAULT '',
  school_phone text DEFAULT '',
  admin_name text DEFAULT '',
  admin_email text DEFAULT '',
  sms_on boolean DEFAULT true,
  email_on boolean DEFAULT false,
  supervisors text[] DEFAULT '{}',
  accountants text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- User-student links (maps auth emails to student records)
-- Replaces hardcoded STUDENT_ACCOUNTS and PARENT_STUDENT_MAP
CREATE TABLE IF NOT EXISTS user_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('self', 'parent')),
  UNIQUE(user_email, student_id)
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_student_links ENABLE ROW LEVEL SECURITY;

-- RLS: students
CREATE POLICY "Admin all on students" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teacher read assigned students" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM teacher_assignments WHERE teacher_email = auth.email() AND class = students.class)
);

CREATE POLICY "Student read own" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Parent read child" ON students FOR SELECT USING (parent_user_id = auth.uid());

-- RLS: grades
CREATE POLICY "Admin all on grades" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teacher CRUD assigned" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM teacher_assignments ta JOIN students s ON s.class = ta.class WHERE ta.teacher_email = auth.email() AND s.id = grades.student_id)
) WITH CHECK (EXISTS (SELECT 1 FROM teacher_assignments ta JOIN students s ON s.class = ta.class WHERE ta.teacher_email = auth.email() AND s.id = grades.student_id));

CREATE POLICY "Student read own grades" ON grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE id = grades.student_id AND user_id = auth.uid())
);
CREATE POLICY "Parent read child grades" ON grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE id = grades.student_id AND parent_user_id = auth.uid())
);

-- RLS: payments
CREATE POLICY "Admin all on payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Accountant all on payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accountant')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accountant'));

CREATE POLICY "Student read own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE id = payments.student_id AND user_id = auth.uid())
);
CREATE POLICY "Parent read child payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE id = payments.student_id AND parent_user_id = auth.uid())
);

-- RLS: teacher_assignments
CREATE POLICY "Admin all on teacher_assignments" ON teacher_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teacher read own" ON teacher_assignments FOR SELECT USING (teacher_email = auth.email());

-- RLS: school_settings
CREATE POLICY "Admin all on school_settings" ON school_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff read school_settings" ON school_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant'))
);

-- RLS: user_student_links
CREATE POLICY "Admin all on user_student_links" ON user_student_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "User read own links" ON user_student_links FOR SELECT USING (user_email = auth.email());

-- Seed students
INSERT INTO students (name, class, grade, email, status, parent, phone) VALUES
  ('Emma Thompson', '10A', '10th', 'emma@school.com', 'Active', 'Robert Thompson', '(555) 123-4567'),
  ('Marcus Johnson', '10A', '10th', 'marcus@school.com', 'Active', 'Sarah Johnson', '(555) 987-6543'),
  ('Olivia Rodriguez', '9B', '9th', 'olivia@school.com', 'Inactive', 'Maria Rodriguez', '(555) 234-5678'),
  ('Liam Chen', '12A', '12th', 'liam@school.com', 'Active', 'Wei Chen', '(555) 456-7890'),
  ('Noah Williams', '10B', '10th', 'noah@school.com', 'Active', 'James Williams', '(555) 345-6789'),
  ('Ava Brown', '9A', '9th', 'ava@school.com', 'Active', 'Emily Brown', '(555) 567-8901'),
  ('Mason Davis', '8A', '8th', 'mason@school.com', 'Active', 'Michael Davis', '(555) 678-9012'),
  ('Sophia Miller', '11A', '11th', 'sophia@school.com', 'Active', 'Laura Miller', '(555) 789-0123'),
  ('Isabella Wilson', '12B', '12th', 'isabella@school.com', 'Active', 'David Wilson', '(555) 890-1234'),
  ('Ethan Moore', '10A', '10th', 'ethan@school.com', 'Inactive', 'Jennifer Moore', '(555) 901-2345');

-- Seed grades
INSERT INTO grades (student_id, subject, score, grade)
SELECT s.id, g.subject, g.score,
  CASE WHEN g.score >= 90 THEN 'A' WHEN g.score >= 80 THEN 'B' WHEN g.score >= 70 THEN 'C' WHEN g.score >= 60 THEN 'D' ELSE 'F' END
FROM (VALUES
  ('Emma Thompson', 'Mathematics', 85), ('Emma Thompson', 'Science', 92), ('Emma Thompson', 'English', 88),
  ('Marcus Johnson', 'Mathematics', 78), ('Marcus Johnson', 'History', 81),
  ('Olivia Rodriguez', 'Mathematics', 95), ('Olivia Rodriguez', 'Science', 89),
  ('Liam Chen', 'Physics', 97), ('Liam Chen', 'Computer Science', 99),
  ('Noah Williams', 'English', 72), ('Noah Williams', 'Art', 85),
  ('Ava Brown', 'Mathematics', 65), ('Mason Davis', 'Science', 90),
  ('Sophia Miller', 'History', 83), ('Isabella Wilson', 'English', 94)
) AS g(sname, subject, score)
JOIN students s ON s.name = g.sname;

-- Seed payments
INSERT INTO payments (student_id, amount, due_date, status)
SELECT s.id, p.amount, p.due_date, p.status
FROM (VALUES
  ('Emma Thompson', 850, 'Oct 25, 2026', 'Overdue'), ('Marcus Johnson', 420, 'Oct 30, 2026', 'Pending'),
  ('Liam Chen', 1100, 'Nov 5, 2026', 'Pending'), ('Noah Williams', 350, 'Nov 12, 2026', 'Pending'),
  ('Emma Thompson', 450, 'Oct 15, 2026', 'Paid'), ('Olivia Rodriguez', 320, 'Oct 20, 2026', 'Pending'),
  ('Ava Brown', 675, 'Nov 1, 2026', 'Paid'), ('Mason Davis', 520, 'Nov 10, 2026', 'Pending'),
  ('Sophia Miller', 1200, 'Sep 30, 2026', 'Paid'), ('Isabella Wilson', 950, 'Oct 5, 2026', 'Paid'),
  ('Marcus Johnson', 200, 'Nov 20, 2026', 'Overdue'), ('Ethan Moore', 780, 'Dec 1, 2026', 'Pending')
) AS p(sname, amount, due_date, status)
JOIN students s ON s.name = p.sname;

-- Seed teacher assignments
INSERT INTO teacher_assignments (teacher_email, class) VALUES
  ('teacher@school.com', '10A'), ('teacher@school.com', '10B')
ON CONFLICT DO NOTHING;

-- Seed user-student links (maps auth emails to student records)
INSERT INTO user_student_links (user_email, student_id, relationship)
  SELECT 'student_1@school.com', id, 'self' FROM students WHERE name = 'Emma Thompson';
INSERT INTO user_student_links (user_email, student_id, relationship)
  SELECT 'parent@school.com', id, 'parent' FROM students WHERE name = 'Emma Thompson';
INSERT INTO user_student_links (user_email, student_id, relationship)
  SELECT 'student_5@school.com', id, 'self' FROM students WHERE name = 'Noah Williams';

-- Seed school settings
INSERT INTO school_settings (school_name, school_address, school_phone, admin_name, admin_email, supervisors, accountants)
  VALUES ('الاخلاء', '', '(555) 123-4567', 'Admin', 'admin@email.com', '{teacher@school.com}', '{}');
