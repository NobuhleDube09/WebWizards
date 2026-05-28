-- ═══════════════════════════════════════════════════════════════════════════
-- CampusConnect v2 Schema — Supabase Auth handles credentials
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- profiles (auth.users.id as FK — Supabase Auth creates the auth user)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  faculty text not null,
  year_of_study int not null,
  bio text default '',
  skills text[] default '{}',
  avatar_url text,
  open_for_orders boolean default true,
  is_verified boolean default false,
  is_admin boolean default false,
  avg_rating numeric(3,2) default 0,
  total_earnings numeric(10,2) default 0,
  xp int default 0,
  fast_response_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  price_type text not null,
  price numeric(10,2),
  delivery_method text not null,
  turnaround_time text not null,
  availability boolean default true,
  images text[] default '{}',
  rating_avg numeric(3,2) default 0,
  review_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id) on delete cascade,
  seller_id uuid not null references users(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  created_at timestamptz default now(),
  unique (buyer_id, seller_id, listing_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id) on delete cascade,
  seller_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  preferred_datetime timestamptz,
  buyer_message text,
  status text not null default 'pending',
  agreed_scope text,
  agreed_price numeric(10,2),
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references orders(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references users(id) on delete cascade,
  seller_id uuid not null references users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  content text not null,
  seller_reply text,
  created_at timestamptz default now()
);

create table if not exists moderation_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  reason text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_listings_category on listings(category);
create index if not exists idx_listings_search on listings using gin (to_tsvector('english', title || ' ' || description));
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_orders_seller_status on orders(seller_id, status);
