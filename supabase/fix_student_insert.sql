-- ============================================================
-- FIX: Add missing columns to students table
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create schools table if missing
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

-- 2. Insert default school
INSERT INTO schools (name, name_en, currency)
VALUES ('مدرسة العامريه', 'Al-Amiriya School', 'SDG')
ON CONFLICT DO NOTHING;

-- 3. Add missing columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 4. Add missing columns to grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- 5. Add missing columns to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method text DEFAULT 'cash';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;

-- 6. Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 7. Add missing columns to teacher_assignments
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- 8. Add missing columns to school_settings
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- 9. Backfill school_id on all tables
DO $block$ DECLARE v_school_id uuid; BEGIN
  SELECT id INTO v_school_id FROM schools LIMIT 1;
  IF v_school_id IS NOT NULL THEN
    UPDATE profiles SET school_id = v_school_id WHERE school_id IS NULL;
    UPDATE students SET school_id = v_school_id WHERE school_id IS NULL;
    UPDATE grades SET school_id = v_school_id WHERE school_id IS NULL;
    UPDATE payments SET school_id = v_school_id WHERE school_id IS NULL;
    UPDATE teacher_assignments SET school_id = v_school_id WHERE school_id IS NULL;
    UPDATE school_settings SET school_id = v_school_id WHERE school_id IS NULL;
  END IF;
END $block$;

-- 10. Drop NOT NULL on students.state
ALTER TABLE students ALTER COLUMN state DROP NOT NULL;
