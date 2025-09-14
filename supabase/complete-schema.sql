-- ============================================================
-- HAUSAWORLD FULL RESET & SCHEMA REBUILD
-- ============================================================
-- ⚠️ WARNING: This will delete all data and rebuild clean schema
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Drop triggers, functions, and views
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user cascade;
drop function if exists update_movie_rating cascade;
drop function if exists set_movie_slug cascade;
drop function if exists generate_slug cascade;
drop function if exists is_admin cascade;
drop function if exists get_movie_file_url cascade;
drop function if exists can_download_movie cascade;
drop view if exists movie_avg_ratings;
drop view if exists movies_with_ratings;

-- 2. Drop tables (reverse dependency order)
drop table if exists download_tokens cascade;
drop table if exists bank_transfers cascade;
drop table if exists purchases cascade;
drop table if exists reviews cascade;
drop table if exists movies cascade;
drop table if exists profiles cascade;

-- 3. Drop storage buckets (removes metadata, not actual file contents)
delete from storage.objects where bucket_id in ('movie-posters','movies','payment-proofs','user-avatars');
delete from storage.buckets where id in ('movie-posters','movies','payment-proofs','user-avatars');

-- ============================================================
-- 4. CREATE TABLES
-- ============================================================

-- Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  notify_new_movies boolean default false,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Movies
create table movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  poster_url text,
  trailer_url text,
  genres text[] default '{}',
  year int,
  price_kobo int not null default 0,
  file_path text,
  is_trending boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- Purchases
create table purchases (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  amount_kobo int not null,
  provider text check (provider in ('flutterwave','bank')) not null,
  status text not null check (status in ('pending','paid','failed','manual_pending','manual_approved','manual_rejected')) default 'pending',
  tx_ref text unique,
  method text check (method in ('card','bank_transfer','wallet')),
  proof_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Bank transfers
create table bank_transfers (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) on delete cascade,
  proof_url text,
  account_name text,
  account_number text,
  bank_name text,
  created_at timestamp with time zone default now()
);

-- Download tokens
create table download_tokens (
  token uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- 5. VIEWS
-- ============================================================

create or replace view movie_avg_ratings as
select m.id as movie_id,
       coalesce(avg(r.rating),0)::numeric(3,2) as avg_rating,
       count(r.id) as review_count
from movies m
left join reviews r on r.movie_id = m.id
group by m.id;

-- ============================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================

-- Slug generator
create or replace function generate_slug(title text)
returns text as $$
begin
  return lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'));
end;
$$ language plpgsql;

-- Auto-set slug
create or replace function set_movie_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_slug(new.title);
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_movie_slug on movies;
create trigger trigger_set_movie_slug
before insert or update on movies
for each row execute function set_movie_slug();

-- New user profile creation
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url, notify_new_movies)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url',''),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Admin check
create or replace function is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (select 1 from profiles where id=user_id and role='admin');
end;
$$ language plpgsql security definer;

-- Movie access check
create or replace function get_movie_file_url(movie_id uuid)
returns text as $$
declare file_path text;
begin
  if not exists (
    select 1 from purchases
    where user_id=auth.uid()
    and movie_id=get_movie_file_url.movie_id
    and status='paid'
  ) then
    return null;
  end if;

  select movies.file_path into file_path
  from movies
  where id=movie_id;

  return file_path;
end;
$$ language plpgsql security definer;

-- Can download movie
create or replace function can_download_movie(movie_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from purchases
    where purchases.movie_id=can_download_movie.movie_id
    and purchases.user_id=can_download_movie.user_id
    and status='paid'
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- 7. RLS & POLICIES
-- ============================================================

alter table profiles enable row level security;
alter table movies enable row level security;
alter table reviews enable row level security;
alter table purchases enable row level security;
alter table bank_transfers enable row level security;
alter table download_tokens enable row level security;

-- Profiles
create policy "select own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Movies
create policy "public read movies" on movies for select using (true);
create policy "admin write movies" on movies for all using (is_admin(auth.uid()));

-- Reviews
create policy "public read reviews" on reviews for select using (true);
create policy "insert own reviews" on reviews for insert with check (auth.uid() = user_id);
create policy "update own reviews" on reviews for update using (auth.uid() = user_id);
create policy "delete own reviews" on reviews for delete using (auth.uid() = user_id);

-- Purchases
create policy "insert own purchases" on purchases for insert with check (auth.uid() = user_id);
create policy "select own purchases" on purchases for select using (auth.uid() = user_id);
create policy "admin manage purchases" on purchases for all using (is_admin(auth.uid()));

-- Bank transfers
create policy "insert own bank transfer" on bank_transfers for insert with check (
  exists(select 1 from purchases p where p.id=purchase_id and p.user_id=auth.uid())
);
create policy "admin manage bank transfers" on bank_transfers for all using (is_admin(auth.uid()));

-- Download tokens
create policy "manage own tokens" on download_tokens for all using (auth.uid() = user_id);

-- ============================================================
-- 8. STORAGE BUCKETS & POLICIES
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('movie-posters', 'movie-posters', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}'),
  ('movies', 'movies', false, 5368709120, '{"video/mp4","video/webm","video/ogg","video/avi","video/quicktime"}'),
  ('payment-proofs', 'payment-proofs', false, 10485760, '{"image/jpeg","image/png","application/pdf"}'),
  ('user-avatars', 'user-avatars', true, 2097152, '{"image/jpeg","image/png","image/webp"}')
on conflict (id) do nothing;

-- Storage: Posters
create policy "public read posters" on storage.objects for select using (bucket_id='movie-posters');
create policy "admin manage posters" on storage.objects for all using (bucket_id='movie-posters' and is_admin(auth.uid()));

-- Storage: Movies
create policy "admin manage movies bucket" on storage.objects for all using (bucket_id='movies' and is_admin(auth.uid()));
create policy "user access purchased movies" on storage.objects for select using (
  bucket_id='movies' and (
    is_admin(auth.uid()) or
    exists(select 1 from purchases p where p.user_id=auth.uid() and p.status='paid')
  )
);

-- Storage: Payment Proofs
create policy "user upload proofs" on storage.objects for insert with check (bucket_id='payment-proofs' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "user view own proofs" on storage.objects for select using (bucket_id='payment-proofs' and (auth.uid()::text=(storage.foldername(name))[1] or is_admin(auth.uid())));
create policy "admin manage proofs" on storage.objects for all using (bucket_id='payment-proofs' and is_admin(auth.uid()));

-- Storage: Avatars
create policy "public read avatars" on storage.objects for select using (bucket_id='user-avatars');
create policy "user manage own avatar" on storage.objects for all using (bucket_id='user-avatars' and auth.uid()::text=(storage.foldername(name))[1]);

-- ============================================================
-- ✅ DONE: Hausaworld schema rebuilt
-- ============================================================
