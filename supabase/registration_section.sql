-- ============================================================
-- Registration Section for New Year Class Enrollment
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  parent_name text NOT NULL,
  phone text NOT NULL,
  email text,
  current_class text,
  desired_class text NOT NULL,
  notes text,
  status text DEFAULT 'confirmed',
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Grants (public form — anon must be able to INSERT)
GRANT ALL ON registration_requests TO anon;
GRANT ALL ON registration_requests TO authenticated;
GRANT anon TO authenticator;
GRANT ALL ON SCHEMA public TO anon;

-- NOTE: RLS is intentionally DISABLED for this table.
-- It's a public registration form — anyone can submit without authentication.
-- Admin viewing is handled client-side in LandingCMS.jsx.
-- If you need server-side admin-only SELECT, re-enable RLS with:
--   ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "admin_select" ON registration_requests FOR SELECT USING (
--     EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
--   );

-- After running grants, reload PostgREST schema cache:
-- SELECT pg_notify('pgrst', 'reload schema');

-- 3. Seed section row (hidden by default, sort_order=2 after Hero)
INSERT INTO landing_sections (type, title, visible, sort_order)
VALUES ('registration', 'التسجيل للعام الجديد', false, 2)
ON CONFLICT (type) DO NOTHING;

-- 4. Seed content row (bilingual format)
INSERT INTO landing_content (key, content)
VALUES ('registration', '{
  "title": {"ar": "التسجيل للعام الدراسي الجديد", "en": "Registration for New Academic Year"},
  "subtitle": {"ar": "سجل الآن واحجز مقعد طفلك في فصله المفضل", "en": "Register now and secure your child''s spot in their preferred class"},
  "deadline": "2026-08-30",
  "classes": [
    {"id": "1", "name": {"ar": "صف أول", "en": "Grade 1"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 30},
    {"id": "2", "name": {"ar": "صف ثاني", "en": "Grade 2"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 30},
    {"id": "3", "name": {"ar": "صف ثالث", "en": "Grade 3"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 30},
    {"id": "4", "name": {"ar": "صف رابع", "en": "Grade 4"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 30},
    {"id": "5", "name": {"ar": "صف خامس", "en": "Grade 5"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 25},
    {"id": "6", "name": {"ar": "صف سادس", "en": "Grade 6"}, "description": {"ar": "المرحلة الابتدائية", "en": "Primary Stage"}, "maxSpots": 25}
  ],
  "trustSignals": [{"ar": "التسجيل مجاني", "en": "Registration is free"}, {"ar": "لا تتطلب وثائق الآن", "en": "No documents required now"}, {"ar": "تأكيد فوري", "en": "Instant confirmation"}],
  "privacyNote": {"ar": "معلوماتك محمية ولن تُستخدم إلا لأغراض التسجيل", "en": "Your information is protected and will only be used for registration purposes"},
  "successMessage": {"ar": "تم تسجيل طفلك بنجاح! سيتم التواصل معك قريباً لتأكيد التسجيل.", "en": "Your child has been registered successfully! We will contact you shortly to confirm enrollment."},
  "fullClassMessage": {"ar": "هذا الصف ممتلئ، تواصل مع المديرية للتسجيل", "en": "This class is full. Contact the school administration to register."}
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
