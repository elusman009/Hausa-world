-- ============================
-- HAUSAWORLD FULL RESET SCRIPT (fixed comment)
-- ============================
-- WARNING: Destructive. BACKUP data first if needed.
-- Run this as a single SQL query.

-- ----------------------------
-- 1) Drop triggers, functions, views, policies, tables
-- ----------------------------

-- Drop trigger on auth.users (if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions used previously
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uid uuid) CASCADE;
DROP FUNCTION IF EXISTS update_movie_rating() CASCADE;
DROP FUNCTION IF EXISTS generate_slug(title TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_movie_slug() CASCADE;

-- Drop views
DROP VIEW IF EXISTS movie_avg_ratings CASCADE;
DROP VIEW IF EXISTS movies_with_ratings CASCADE;

-- Explicitly drop tables (cascade to remove dependent objects)
DROP TABLE IF EXISTS download_tokens CASCADE;
DROP TABLE IF EXISTS bank_transfers CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ----------------------------
-- 2) Create extensions required
-- ----------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------
-- 3) Recreate tables & objects (clean final schema)
-- ----------------------------

-- PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  notify_new_movies boolean DEFAULT false,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz DEFAULT now()
);

-- Function: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: call when a new auth.users row is inserted
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- MOVIES
CREATE TABLE movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  description text,
  poster_url text,
  trailer_url text,
  genres text[] DEFAULT '{}',
  year int,
  price_kobo int NOT NULL DEFAULT 0,
  is_trending boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- REVIEWS
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- PURCHASES
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount_kobo int NOT NULL,
  provider text CHECK (provider IN ('flutterwave','bank')) NOT NULL,
  status text NOT NULL CHECK (
    status IN ('pending','paid','failed','manual_pending','manual_approved','manual_rejected')
  ) DEFAULT 'pending',
  tx_ref text,
  created_at timestamptz DEFAULT now()
);

-- BANK TRANSFERS
CREATE TABLE bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  proof_url text,
  account_name text,
  account_number text,
  bank_name text,
  created_at timestamptz DEFAULT now()
);

-- DOWNLOAD TOKENS
CREATE TABLE download_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- VIEW: avg ratings per movie
CREATE OR REPLACE VIEW movie_avg_ratings AS
SELECT m.id AS movie_id,
       COALESCE(AVG(r.rating),0)::numeric(3,2) AS avg_rating,
       COUNT(r.id) AS review_count
FROM movies m
LEFT JOIN reviews r ON r.movie_id = m.id
GROUP BY m.id;

-- Optional helper: is_admin function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- ----------------------------
-- 4) Enable RLS & create policies
-- ----------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;

-- Drop policies if present (idempotent attempts)
DROP POLICY IF EXISTS "select own profile" ON profiles;
DROP POLICY IF EXISTS "update own profile" ON profiles;

DROP POLICY IF EXISTS "select movies" ON movies;
DROP POLICY IF EXISTS "admin manage movies" ON movies;

DROP POLICY IF EXISTS "select reviews" ON reviews;
DROP POLICY IF EXISTS "insert reviews" ON reviews;
DROP POLICY IF EXISTS "update own reviews" ON reviews;
DROP POLICY IF EXISTS "delete own reviews" ON reviews;

DROP POLICY IF EXISTS "insert own purchases" ON purchases;
DROP POLICY IF EXISTS "select own purchases" ON purchases;
DROP POLICY IF EXISTS "admin manage purchases" ON purchases;

DROP POLICY IF EXISTS "insert bank transfer for own purchase" ON bank_transfers;
DROP POLICY IF EXISTS "select own bank transfers" ON bank_transfers;
DROP POLICY IF EXISTS "admin manage bank transfers" ON bank_transfers;

DROP POLICY IF EXISTS "manage own tokens" ON download_tokens;

-- Create policies

CREATE POLICY "select own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "select movies" ON movies FOR SELECT USING (true);
CREATE POLICY "admin manage movies" ON movies FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "select reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "insert own purchases" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin manage purchases" ON purchases FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "insert bank transfer for own purchase" ON bank_transfers
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.user_id = auth.uid())
  );

CREATE POLICY "select own bank transfers" ON bank_transfers
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.user_id = auth.uid())
  );

CREATE POLICY "admin manage bank transfers" ON bank_transfers FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "manage own tokens" ON download_tokens FOR ALL USING (auth.uid() = user_id);

-- ----------------------------
-- 5) Grants for basic usage (optional)
-- ----------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ----------------------------
-- 6) Comment with timestamp (safe method)
-- ----------------------------
DO $$
BEGIN
  EXECUTE format(
    'COMMENT ON SCHEMA public IS %L',
    'Hausaworld schema reset on ' || to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  );
END
$$;
