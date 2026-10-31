-- ============================================================================
-- STEP 2 OF 3: STORAGE BUCKET & STORAGE POLICIES
-- Paste and run this file SECOND in Supabase SQL Editor.
-- ============================================================================

-- 1. Create public storage bucket for MCQ question diagrams/images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mcq-images', 'mcq-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to ensure clean execution
DROP POLICY IF EXISTS "Anyone can view mcq images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can upload mcq images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload mcq images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage mcq images" ON storage.objects;

-- 3. Storage Policies
-- Anyone (students, visitors, teachers) can view images
CREATE POLICY "Anyone can view mcq images" ON storage.objects
  FOR SELECT USING (bucket_id = 'mcq-images');

-- Authenticated teachers and admins can upload question images
CREATE POLICY "Authenticated users can upload mcq images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mcq-images' AND
    auth.role() = 'authenticated'
  );

-- Authenticated users can update/replace images in the bucket
CREATE POLICY "Authenticated users can update mcq images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mcq-images' AND
    auth.role() = 'authenticated'
  );

-- Authenticated users can delete images from the bucket
CREATE POLICY "Authenticated users can delete mcq images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mcq-images' AND
    auth.role() = 'authenticated'
  );

