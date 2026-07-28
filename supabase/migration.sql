
-- Landing sections (toggle visibility, reorder)
CREATE TABLE IF NOT EXISTS landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text UNIQUE NOT NULL,
  title text NOT NULL,
  visible boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed default sections
INSERT INTO landing_sections (type, title, sort_order) VALUES
  ('hero', 'Hero', 1),
  ('honor_board', 'Honor Board', 2),
  ('events', 'Events', 3),
  ('achievements', 'Achievements', 4),
  ('about', 'About', 5),
  ('teachers', 'Teachers', 6),
  ('contact', 'Contact', 7)
ON CONFLICT (type) DO NOTHING;

-- Landing content (hero, about, etc.)
CREATE TABLE IF NOT EXISTS landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  description text,
  image text,
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  image text,
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  bio text,
  created_at timestamptz DEFAULT now()
);

-- Seed default teachers
INSERT INTO teachers (name, subject, bio) VALUES
  ('Mr. Williams', 'Mathematics', '15 years of teaching experience. Passionate about making math fun.'),
  ('Ms. Garcia', 'Science', 'Former research scientist turned educator. Loves hands-on experiments.'),
  ('Mrs. Johnson', 'English Literature', 'Published author and dedicated literature teacher.'),
  ('Mr. Chen', 'Computer Science', 'Tech industry veteran. Teaches coding and digital literacy.')
ON CONFLICT DO NOTHING;

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role text DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher', 'parent', 'student', 'worker')),
  avatar text,
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'teacher'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for landing page data
CREATE POLICY "Public can read landing_sections" ON landing_sections FOR SELECT USING (true);
CREATE POLICY "Public can read landing_content" ON landing_content FOR SELECT USING (true);
CREATE POLICY "Public can read events" ON events FOR SELECT USING (visible = true);
CREATE POLICY "Public can read achievements" ON achievements FOR SELECT USING (visible = true);
CREATE POLICY "Public can read teachers" ON teachers FOR SELECT USING (true);

-- Admin full access (checks actual admin role from profiles, not just being authenticated)
CREATE POLICY "Admin all on landing_sections" ON landing_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all on landing_content" ON landing_content FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all on events" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all on achievements" ON achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all on teachers" ON teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Profiles: user reads/updates own, admin reads all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  student_name text,
  target_roles text[] DEFAULT '{admin,teacher}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert notifications" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant'))
);
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant'))
);
CREATE POLICY "Staff can update notifications" ON notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant'))
);

-- Seed honor board
INSERT INTO landing_content (key, content) VALUES ('honor_board', '{"entries": [{"name": "Emma Thompson", "grade": "10th", "class": "10A", "score": 95, "rank": "1st", "medal": "Gold Medal"}, {"name": "Marcus Johnson", "grade": "10th", "class": "10A", "score": 81, "rank": "2nd", "medal": "Silver Medal"}, {"name": "Olivia Rodriguez", "grade": "9th", "class": "9B", "score": 92, "rank": "3rd", "medal": "Bronze Medal"}]}')
ON CONFLICT (key) DO NOTHING;

-- Add time and location to events (idempotent)
ALTER TABLE events ADD COLUMN IF NOT EXISTS time text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location text;

-- Add image to teachers (idempotent)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS image text;
