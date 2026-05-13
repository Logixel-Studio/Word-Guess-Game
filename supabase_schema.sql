-- NUTRIMETH BMS - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  address text,
  description text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Suppliers
create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  address text,
  description text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  materials jsonb default '[]'::jsonb,
  production_cost numeric default 0,
  stock_qty numeric default 0,
  status text default 'in_stock' check (status in ('in_stock', 'low_stock', 'out_of_stock')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense Types
create table if not exists expense_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Purchase Types
create table if not exists purchase_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sales
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  client_name text,
  product_id uuid references products(id) on delete set null,
  product_name text,
  qty numeric not null,
  unit_price numeric not null,
  total numeric,
  cost_per_unit numeric default 0,
  profit numeric default 0,
  description text,
  payment_status text default 'unpaid' check (payment_status in ('paid', 'unpaid', 'partial')),
  paid_amount numeric default 0,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Purchases
create table if not exists purchases (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references suppliers(id) on delete set null,
  supplier_name text,
  purchase_type_id uuid references purchase_types(id) on delete set null,
  purchase_type_name text,
  qty numeric not null,
  unit_price numeric not null,
  total numeric,
  description text,
  payment_status text default 'unpaid' check (payment_status in ('paid', 'unpaid', 'partial')),
  paid_amount numeric default 0,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  expense_type_id uuid references expense_types(id) on delete set null,
  expense_type_name text,
  qty numeric not null,
  unit_price numeric not null,
  total numeric,
  description text,
  payment_status text default 'unpaid' check (payment_status in ('paid', 'unpaid', 'partial')),
  paid_amount numeric default 0,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Company Settings
create table if not exists company_settings (
  id uuid primary key default uuid_generate_v4(),
  company_name text default 'NUTRIMETH',
  logo_url text,
  currency text default 'PKR',
  currency_symbol text default 'Rs',
  tax_rate numeric default 0,
  address text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default company settings if none exist
insert into company_settings (company_name, currency, currency_symbol)
select 'NUTRIMETH', 'PKR', 'Rs'
where not exists (select 1 from company_settings);

-- Indexes for common queries
create index if not exists idx_sales_client_id on sales(client_id);
create index if not exists idx_sales_product_id on sales(product_id);
create index if not exists idx_sales_payment_status on sales(payment_status);
create index if not exists idx_sales_created_at on sales(created_at desc);
create index if not exists idx_purchases_supplier_id on purchases(supplier_id);
create index if not exists idx_purchases_payment_status on purchases(payment_status);
create index if not exists idx_purchases_created_at on purchases(created_at desc);
create index if not exists idx_expenses_expense_type_id on expenses(expense_type_id);
create index if not exists idx_expenses_payment_status on expenses(payment_status);
create index if not exists idx_expenses_created_at on expenses(created_at desc);
create index if not exists idx_products_status on products(status);

-- Enable Row Level Security (RLS) - disable for now since app uses anon key
-- If you want to secure later, enable RLS and add policies per user
alter table clients disable row level security;
alter table suppliers disable row level security;
alter table products disable row level security;
alter table expense_types disable row level security;
alter table purchase_types disable row level security;
alter table sales disable row level security;
alter table purchases disable row level security;
alter table expenses disable row level security;
alter table company_settings disable row level security;

-- Enable Realtime for live updates
alter publication supabase_realtime add table sales;
alter publication supabase_realtime add table purchases;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table company_settings;
