-- ============================================================
-- FIX: Enable RLS on registration_requests
-- The table has RLS disabled with GRANT ALL to anon,
-- meaning anyone can read/modify/delete all registration records.
-- Fix: Enable RLS with proper policies.
-- ============================================================

-- Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (public registration form)
CREATE POLICY "anon_can_insert" ON registration_requests
FOR INSERT TO anon
WITH CHECK (true);

-- Allow authenticated users to INSERT too
CREATE POLICY "auth_can_insert" ON registration_requests
FOR INSERT TO authenticated
WITH CHECK (true);

-- Admins can read all registrations in their school
CREATE POLICY "admin_can_select" ON registration_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = registration_requests.school_id
  )
);

-- Admins can update registrations in their school
CREATE POLICY "admin_can_update" ON registration_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = registration_requests.school_id
  )
)
WITH CHECK (true);

-- Admins can delete registrations in their school
CREATE POLICY "admin_can_delete" ON registration_requests
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = registration_requests.school_id
  )
);

-- Supervisor can read too
CREATE POLICY "supervisor_can_select" ON registration_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
    AND profiles.school_id = registration_requests.school_id
  )
);
