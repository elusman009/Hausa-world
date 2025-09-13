-- Full schema with RLS and admin settings

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  notify_new_movies boolean default false,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamp with time zone default now()
);

-- Movies
create table if not exists movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  poster_url text,
  trailer_url text,
  genres text[] default '{}',
  year int,
  price_kobo int not null default 0,
  is_trending boolean default false,
  created_at timestamp with time zone default now()
);

-- Reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  content text,
  created_at timestamp with time zone default now()
);

-- Purchases
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  amount_kobo int not null,
  provider text check (provider in ('flutterwave','bank')) not null,
  status text not null check (status in ('pending','paid','failed','manual_pending','manual_approved','manual_rejected')) default 'pending',
  tx_ref text,
  created_at timestamp with time zone default now()
);

-- Bank transfers (proof)
create table if not exists bank_transfers (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) on delete cascade,
  proof_url text,
  account_name text,
  account_number text,
  bank_name text,
  created_at timestamp with time zone default now()
);

-- Download tokens (signed short lived)
create table if not exists download_tokens (
  token uuid primary key default gen_random_uuid(),
  movie_id uuid references movies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- View for avg ratings
create or replace view movie_avg_ratings as
select m.id as movie_id, coalesce(avg(r.rating),0)::numeric(3,2) as avg_rating, count(r.id) as review_count
from movies m
left join reviews r on r.movie_id = m.id
group by m.id;

-- Enable RLS
alter table profiles enable row level security;
alter table movies enable row level security;
alter table reviews enable row level security;
alter table purchases enable row level security;
alter table bank_transfers enable row level security;
alter table download_tokens enable row level security;

-- Policies
-- Profiles: only owner can select/update
create policy "select own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Movies: public select; admin insert/update/delete
create policy "select movies" on movies for select using (true);
create policy "admin write movies" on movies for all using (
  exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Reviews
create policy "select reviews" on reviews for select using (true);
create policy "insert reviews" on reviews for insert with check (auth.uid() = user_id);
create policy "update delete own reviews" on reviews for update using (auth.uid() = user_id);

-- Purchases: users can insert/read own; admins can manage
create policy "insert own purchases" on purchases for insert with check (auth.uid() = user_id);
create policy "select own purchases" on purchases for select using (auth.uid() = user_id);
create policy "admin manage purchases" on purchases for update, delete using (
  exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Bank transfers: user can insert if linked to own purchase; admins can manage
create policy "insert bank transfers for own purchase" on bank_transfers for insert with check (
  exists(select 1 from purchases p where p.id = purchase_id and p.user_id = auth.uid())
);
create policy "admin manage bank transfers" on bank_transfers for select, update, delete using (
  exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Download tokens: user manages own
create policy "manage own tokens" on download_tokens for all using (auth.uid() = user_id);

-- Set app admin emails as a GUC (optional)
-- alter database postgres set app.admin_emails = 'youremail@gmail.com';
