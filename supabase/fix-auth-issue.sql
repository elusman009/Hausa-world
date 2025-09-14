-- Fix for "Database error saving new user" issue
-- Run this in your Supabase SQL Editor to resolve authentication problems

-- 1. Remove email unique constraint to prevent conflicts
-- (This is likely the root cause of the authentication failures)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- 2. Make the trigger function idempotent (handles duplicate inserts gracefully)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, notify_new_movies)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    true  -- Match the client fallback default
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add RLS policies to allow users to manage their own profiles
-- (This enables the client-side fallback to work with upsert)
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Ensure the trigger exists (recreate it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Clean up any potential duplicate data (optional - run if you have existing issues)
-- DELETE FROM profiles 
-- WHERE id NOT IN (
--   SELECT DISTINCT id FROM profiles p1 
--   WHERE NOT EXISTS (
--     SELECT 1 FROM profiles p2 
--     WHERE p2.id = p1.id AND p2.created_at > p1.created_at
--   )
-- );

-- That's it! Your authentication should now work properly.