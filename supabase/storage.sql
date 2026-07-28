-- ============================================================
-- SUPABASE STORAGE: student-photos bucket
-- Run this AFTER sudanization.sql
-- ============================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- Admin/supervisor can upload photos for students in their school
CREATE POLICY "School staff can upload student photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
    AND school_id::text = (storage.foldername(name))[1]
  )
);

-- Anyone can view student photos (public bucket)
CREATE POLICY "Public can view student photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'student-photos');

-- Admin/supervisor can delete photos in their school
CREATE POLICY "School staff can delete student photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
    AND school_id::text = (storage.foldername(name))[1]
  )
);

-- Admin/supervisor can update (replace) photos in their school
CREATE POLICY "School staff can update student photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
    AND school_id::text = (storage.foldername(name))[1]
  )
);
