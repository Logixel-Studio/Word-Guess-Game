-- ============================================================
-- NUTRIMETH BMS - Auth & Creator Fields Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create user_profiles table (synced with auth.users)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- Allow authenticated users to read all profiles (needed for team page & creator dropdown)
create policy if not exists "Authenticated users can view all profiles"
  on user_profiles for select
  to authenticated
  using (true);

-- Allow users to insert/update their own profile
create policy if not exists "Users can insert own profile"
  on user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy if not exists "Users can update own profile"
  on user_profiles for update
  to authenticated
  using (auth.uid() = id);

-- Allow users to delete other profiles (team management) - only authenticated
create policy if not exists "Authenticated users can delete profiles"
  on user_profiles for delete
  to authenticated
  using (true);

-- 2. Add creator fields to all business tables
-- (Safe: uses IF NOT EXISTS equivalent via DO block)

DO $$
BEGIN
  -- clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='creator_id') THEN
    ALTER TABLE clients ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='creator_name') THEN
    ALTER TABLE clients ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='creator_email') THEN
    ALTER TABLE clients ADD COLUMN creator_email text;
  END IF;

  -- suppliers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='creator_id') THEN
    ALTER TABLE suppliers ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='creator_name') THEN
    ALTER TABLE suppliers ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='creator_email') THEN
    ALTER TABLE suppliers ADD COLUMN creator_email text;
  END IF;

  -- products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='creator_id') THEN
    ALTER TABLE products ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='creator_name') THEN
    ALTER TABLE products ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='creator_email') THEN
    ALTER TABLE products ADD COLUMN creator_email text;
  END IF;

  -- sales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='creator_id') THEN
    ALTER TABLE sales ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='creator_name') THEN
    ALTER TABLE sales ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='creator_email') THEN
    ALTER TABLE sales ADD COLUMN creator_email text;
  END IF;

  -- purchases
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='creator_id') THEN
    ALTER TABLE purchases ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='creator_name') THEN
    ALTER TABLE purchases ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='creator_email') THEN
    ALTER TABLE purchases ADD COLUMN creator_email text;
  END IF;

  -- expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='creator_id') THEN
    ALTER TABLE expenses ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='creator_name') THEN
    ALTER TABLE expenses ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='creator_email') THEN
    ALTER TABLE expenses ADD COLUMN creator_email text;
  END IF;

  -- expense_types
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_types' AND column_name='creator_id') THEN
    ALTER TABLE expense_types ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_types' AND column_name='creator_name') THEN
    ALTER TABLE expense_types ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_types' AND column_name='creator_email') THEN
    ALTER TABLE expense_types ADD COLUMN creator_email text;
  END IF;

  -- purchase_types
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_types' AND column_name='creator_id') THEN
    ALTER TABLE purchase_types ADD COLUMN creator_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_types' AND column_name='creator_name') THEN
    ALTER TABLE purchase_types ADD COLUMN creator_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_types' AND column_name='creator_email') THEN
    ALTER TABLE purchase_types ADD COLUMN creator_email text;
  END IF;

END $$;

-- 3. Keep all business tables with RLS disabled (shared team system)
alter table clients disable row level security;
alter table suppliers disable row level security;
alter table products disable row level security;
alter table sales disable row level security;
alter table purchases disable row level security;
alter table expenses disable row level security;
alter table expense_types disable row level security;
alter table purchase_types disable row level security;
alter table company_settings disable row level security;

-- 4. Realtime for user_profiles (team page live updates)
alter publication supabase_realtime add table user_profiles;

-- 5. Index for creator filtering
create index if not exists idx_sales_creator_name on sales(creator_name);
create index if not exists idx_purchases_creator_name on purchases(creator_name);
create index if not exists idx_expenses_creator_name on expenses(creator_name);
create index if not exists idx_clients_creator_name on clients(creator_name);
create index if not exists idx_suppliers_creator_name on suppliers(creator_name);
create index if not exists idx_products_creator_name on products(creator_name);

-- Done! Run supabase_schema.sql first if tables don't exist yet.
