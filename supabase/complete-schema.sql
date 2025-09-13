-- Complete Hausaworld Database Schema
-- Run this in your Supabase SQL Editor

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.admin_emails" TO 'youremail@gmail.com,admin@hausaworld.com';

-- =============================================
-- TABLES
-- =============================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  notify_new_movies BOOLEAN DEFAULT false,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table (matches frontend expectations)
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  genre TEXT, -- Single genre (not array) to match frontend
  year INTEGER,
  rating DECIMAL(3,2) DEFAULT 0, -- Average rating field for frontend
  price_kobo INTEGER NOT NULL DEFAULT 0,
  poster_url TEXT,
  file_path TEXT, -- Path to movie file in storage
  trailer_url TEXT,
  is_trending BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table (matches frontend usage)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT, -- Changed from 'content' to match frontend
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(movie_id, user_id) -- One review per user per movie
);

-- Purchases table (matches API routes and existing backend)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_kobo INTEGER NOT NULL,
  provider TEXT CHECK (provider IN ('flutterwave', 'bank')) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'manual_pending', 'manual_approved', 'manual_rejected')) DEFAULT 'pending',
  tx_ref TEXT UNIQUE, -- Flutterwave transaction reference
  method TEXT CHECK (method IN ('card', 'bank_transfer', 'wallet')),
  proof_url TEXT, -- For manual bank transfers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download tokens for secure file access
CREATE TABLE IF NOT EXISTS download_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(genre);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);
CREATE INDEX IF NOT EXISTS idx_movies_trending ON movies(is_trending);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- =============================================
-- VIEWS
-- =============================================

-- View for movies with average ratings (updates movie.rating field)
CREATE OR REPLACE VIEW movies_with_ratings AS
SELECT 
  m.*,
  COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) AS avg_rating,
  COUNT(r.id) AS review_count
FROM movies m
LEFT JOIN reviews r ON r.movie_id = m.id
GROUP BY m.id;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update movie rating when reviews change
CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE movies 
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2)
    FROM reviews 
    WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update movie rating when reviews change
DROP TRIGGER IF EXISTS trigger_update_movie_rating ON reviews;
CREATE TRIGGER trigger_update_movie_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_movie_rating();

-- Create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-generate slug for movies
CREATE OR REPLACE FUNCTION set_movie_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_movie_slug ON movies;
CREATE TRIGGER trigger_set_movie_slug
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION set_movie_slug();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view movies" ON movies;
DROP POLICY IF EXISTS "Admins can manage movies" ON movies;
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can manage all purchases" ON purchases;
DROP POLICY IF EXISTS "Users can manage own download tokens" ON download_tokens;

-- Profiles: Users can view/update their own profile, admins can view all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (is_admin(auth.uid()));

-- Movies: Public read, admin write
CREATE POLICY "Public can view movies" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage movies" ON movies
  FOR ALL USING (is_admin(auth.uid()));

-- Reviews: Public read, authenticated users can write their own
CREATE POLICY "Public can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (is_admin(auth.uid()));

-- Purchases: Users can view/create their own, admins can manage all
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all purchases" ON purchases
  FOR ALL USING (is_admin(auth.uid()));

-- Download tokens: Users can manage their own tokens
CREATE POLICY "Users can manage own download tokens" ON download_tokens
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- SAMPLE DATA (Optional - Remove in production)
-- =============================================

-- Insert sample admin user (replace with your email)
-- You'll need to sign up first, then run this to make yourself admin
-- UPDATE profiles SET role = 'admin' WHERE email = 'youremail@gmail.com';

-- Sample movies data
INSERT INTO movies (title, description, genre, year, price_kobo, poster_url, is_trending) VALUES
('The Lion King', 'A young lion prince flees his kingdom only to learn the true meaning of responsibility and bravery.', 'Animation', 2019, 150000, 'https://example.com/lion-king.jpg', true),
('Black Panther', 'T''Challa returns home to the reclusive, technologically advanced African nation of Wakanda to serve as his country''s new king.', 'Action', 2018, 200000, 'https://example.com/black-panther.jpg', true),
('Inception', 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.', 'Sci-Fi', 2010, 180000, 'https://example.com/inception.jpg', false)
ON CONFLICT (slug) DO NOTHING;

-- Grant minimal necessary permissions (RLS handles data access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
