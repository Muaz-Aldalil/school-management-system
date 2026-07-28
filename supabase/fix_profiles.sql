-- Add 'pending' to the allowed roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'parent', 'student', 'worker', 'pending', 'accountant', 'supervisor'));

-- Add phone column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Fix trigger: first user = admin, others = pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 THEN 'admin' ELSE COALESCE(new.raw_user_meta_data->>'role', 'pending') END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
