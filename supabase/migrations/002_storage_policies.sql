-- ============================================================
-- JobHunter AI — Storage RLS Policies for 'resumes' bucket
-- ============================================================

-- 1. Allow authenticated users to upload resumes into their own folder (user_id/filename)
CREATE POLICY "Allow authenticated uploads to resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- 2. Allow authenticated users to view and download their own resumes
CREATE POLICY "Allow authenticated reads from resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- 3. Allow authenticated users to delete their own resumes
CREATE POLICY "Allow authenticated deletes from resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (name LIKE (auth.uid()::text || '/%'))
);

-- 4. Allow authenticated users to update their own resumes
CREATE POLICY "Allow authenticated updates to resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (name LIKE (auth.uid()::text || '/%'))
);
