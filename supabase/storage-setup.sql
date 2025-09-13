-- Storage Setup for Hausaworld
-- Run this in your Supabase SQL Editor AFTER creating the main schema

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets (note: bucket name should match what's used in getSignedUrl - 'movies' not 'movie-files')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('movie-posters', 'movie-posters', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}'),
  ('movies', 'movies', false, 5368709120, '{"video/mp4","video/webm","video/ogg","video/avi","video/quicktime"}'),
  ('payment-proofs', 'payment-proofs', false, 10485760, '{"image/jpeg","image/png","image/pdf"}'),
  ('user-avatars', 'user-avatars', true, 2097152, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Movie Posters (Public read, admin write)
CREATE POLICY "Public can view movie posters" ON storage.objects
  FOR SELECT USING (bucket_id = 'movie-posters');

CREATE POLICY "Admins can upload movie posters" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'movie-posters' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update movie posters" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'movie-posters' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete movie posters" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'movie-posters' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Movie Files (Private - only accessible to users who purchased)
CREATE POLICY "Users can access purchased movie files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'movies' AND (
      -- Admin can access all files
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
      -- User can access files for movies they purchased
      EXISTS (
        SELECT 1 FROM purchases p 
        JOIN movies m ON p.movie_id = m.id 
        WHERE p.user_id = auth.uid() 
        AND p.status = 'paid' 
        AND m.file_path = name
      )
    )
  );

CREATE POLICY "Admins can manage movie files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'movies' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payment Proofs (Users can upload their own, admins can view all)
CREATE POLICY "Users can upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own payment proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Admins can manage payment proofs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-proofs' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User Avatars (Users can manage their own)
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- HELPER FUNCTIONS FOR FILE ACCESS
-- =============================================

-- Function to get signed URL for movie file (only if user purchased)
CREATE OR REPLACE FUNCTION get_movie_file_url(movie_id UUID)
RETURNS TEXT AS $$
DECLARE
  file_path TEXT;
BEGIN
  -- Check if user purchased the movie
  IF NOT EXISTS (
    SELECT 1 FROM purchases 
    WHERE user_id = auth.uid() 
    AND movie_id = get_movie_file_url.movie_id 
    AND status = 'paid'
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get file path
  SELECT movies.file_path INTO file_path 
  FROM movies 
  WHERE id = movie_id;
  
  -- Return the file path (frontend will generate signed URL)
  RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can download movie
CREATE OR REPLACE FUNCTION can_download_movie(movie_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM purchases 
    WHERE purchases.movie_id = can_download_movie.movie_id 
    AND purchases.user_id = can_download_movie.user_id 
    AND status = 'paid'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;