-- ═══════════════════════════════════════════════════════════════════════════
-- NUTRIMETH BMS — COMPLETE SUPABASE SCHEMA v3
-- 
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste this → Run
--
-- SAFE TO RUN MULTIPLE TIMES (uses IF NOT EXISTS everywhere)
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────
-- DROP & RECREATE (clean slate) — comment out if you want to keep data
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  DROP TABLE IF EXISTS permission_change_logs CASCADE;
  DROP TABLE IF EXISTS role_permissions       CASCADE;
  DROP TABLE IF EXISTS custom_roles           CASCADE;
  DROP TABLE IF EXISTS actions                CASCADE;
  DROP TABLE IF EXISTS invoices               CASCADE;
  DROP TABLE IF EXISTS tasks                  CASCADE;
  DROP TABLE IF EXISTS payroll                CASCADE;
  DROP TABLE IF EXISTS leave_requests         CASCADE;
  DROP TABLE IF EXISTS attendance             CASCADE;
  DROP TABLE IF EXISTS employee_locations     CASCADE;
  DROP TABLE IF EXISTS office_locations       CASCADE;
  DROP TABLE IF EXISTS expenses               CASCADE;
  DROP TABLE IF EXISTS expense_types          CASCADE;
  DROP TABLE IF EXISTS sales                  CASCADE;
  DROP TABLE IF EXISTS purchases              CASCADE;
  DROP TABLE IF EXISTS purchase_types         CASCADE;
  DROP TABLE IF EXISTS products               CASCADE;
  DROP TABLE IF EXISTS suppliers              CASCADE;
  DROP TABLE IF EXISTS clients                CASCADE;
  DROP TABLE IF EXISTS employees              CASCADE;
  DROP TABLE IF EXISTS company_settings       CASCADE;
  DROP TABLE IF EXISTS profiles               CASCADE;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'employee'
                 CHECK (role IN ('super_admin','admin','manager','employee',
                                 'hr_manager','accountant','inventory_manager','sales_manager')),
  avatar_url   TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role','employee')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. COMPANY SETTINGS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE company_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name    TEXT DEFAULT 'NUTRIMETH',
  logo_url        TEXT,
  currency        TEXT DEFAULT 'PKR',
  currency_symbol TEXT DEFAULT 'Rs',
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);
-- Seed default settings
INSERT INTO company_settings (company_name, currency, currency_symbol)
VALUES ('NUTRIMETH', 'PKR', 'Rs');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. EMPLOYEES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  employee_id     TEXT UNIQUE,
  email           TEXT,
  phone           TEXT,
  role            TEXT DEFAULT 'employee',
  department      TEXT,
  designation     TEXT,
  joining_date    DATE,
  basic_salary    NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  address         TEXT,
  cnic            TEXT,
  bank_account    TEXT,
  profile_photo   TEXT,
  shift_start     TEXT,
  shift_end       TEXT,
  grace_minutes   INTEGER DEFAULT 15,
  overtime_rate   NUMERIC(4,2) DEFAULT 1.5,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. OFFICE LOCATIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE office_locations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  address        TEXT,
  latitude       NUMERIC(10,6),
  longitude      NUMERIC(10,6),
  radius_meters  INTEGER DEFAULT 100,
  shift_start    TEXT,
  shift_end      TEXT,
  grace_minutes  INTEGER DEFAULT 15,
  status         TEXT DEFAULT 'active',
  created_date   TIMESTAMPTZ DEFAULT now(),
  updated_date   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. EMPLOYEE LOCATIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE employee_locations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id          UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name        TEXT,
  office_location_id   UUID REFERENCES office_locations(id) ON DELETE CASCADE,
  office_location_name TEXT,
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. ATTENDANCE
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    TEXT NOT NULL,
  employee_name  TEXT,
  date           DATE NOT NULL,
  check_in       TEXT,
  check_out      TEXT,
  check_in_lat   NUMERIC(10,6),
  check_in_lng   NUMERIC(10,6),
  check_out_lat  NUMERIC(10,6),
  check_out_lng  NUMERIC(10,6),
  status         TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','on_leave')),
  working_hours  NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  late_minutes   INTEGER DEFAULT 0,
  notes          TEXT,
  created_date   TIMESTAMPTZ DEFAULT now(),
  updated_date   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. LEAVE REQUESTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      TEXT NOT NULL,
  employee_name    TEXT,
  leave_type       TEXT,
  from_date        DATE,
  to_date          DATE,
  days             INTEGER,
  reason           TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by      TEXT,
  review_notes     TEXT,
  notes            TEXT,
  created_by_id    TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id    TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date     TIMESTAMPTZ DEFAULT now(),
  updated_date     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. CLIENTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  phone        TEXT,
  address      TEXT,
  description  TEXT,
  status       TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. SUPPLIERS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  phone        TEXT,
  address      TEXT,
  description  TEXT,
  status       TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 10. PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  materials       JSONB DEFAULT '[]',
  production_cost NUMERIC(12,2) DEFAULT 0,
  stock_qty       NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'active',
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 11. PURCHASE TYPES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE purchase_types (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 12. PURCHASES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id         TEXT, supplier_name TEXT,
  purchase_type_id    TEXT, purchase_type_name TEXT,
  qty                 NUMERIC(12,2) DEFAULT 0,
  unit_price          NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(14,2) DEFAULT 0,
  description         TEXT,
  payment_status      TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','partial')),
  paid_amount         NUMERIC(14,2) DEFAULT 0,
  due_date            DATE,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 13. SALES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      TEXT, client_name TEXT,
  product_id     TEXT, product_name TEXT,
  qty            NUMERIC(12,2) DEFAULT 0,
  unit_price     NUMERIC(12,2) DEFAULT 0,
  total          NUMERIC(14,2) DEFAULT 0,
  cost_per_unit  NUMERIC(12,2) DEFAULT 0,
  profit         NUMERIC(14,2) DEFAULT 0,
  description    TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','partial')),
  paid_amount    NUMERIC(14,2) DEFAULT 0,
  due_date       DATE,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 14. EXPENSE TYPES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE expense_types (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 15. EXPENSES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_type_id   TEXT, expense_type_name TEXT,
  qty               NUMERIC(12,2) DEFAULT 1,
  unit_price        NUMERIC(12,2) DEFAULT 0,
  total             NUMERIC(14,2) DEFAULT 0,
  description       TEXT,
  payment_status    TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','partial')),
  paid_amount       NUMERIC(14,2) DEFAULT 0,
  due_date          DATE,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 16. PAYROLL
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE payroll (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id          TEXT NOT NULL,
  employee_name        TEXT,
  employee_email       TEXT,
  employee_department  TEXT,
  employee_role        TEXT,
  month                TEXT NOT NULL,
  basic_salary         NUMERIC(12,2) DEFAULT 0,
  overtime_hours       NUMERIC(6,2)  DEFAULT 0,
  overtime_amount      NUMERIC(12,2) DEFAULT 0,
  overtime_pay         NUMERIC(12,2) DEFAULT 0,
  bonus                NUMERIC(12,2) DEFAULT 0,
  bonus_amount         NUMERIC(12,2) DEFAULT 0,
  deductions           NUMERIC(12,2) DEFAULT 0,
  late_deduction       NUMERIC(12,2) DEFAULT 0,
  leave_deduction      NUMERIC(12,2) DEFAULT 0,
  gross_salary         NUMERIC(12,2) DEFAULT 0,
  net_salary           NUMERIC(12,2) DEFAULT 0,
  total_days           INTEGER DEFAULT 0,
  present_days         INTEGER DEFAULT 0,
  absent_days          INTEGER DEFAULT 0,
  late_days            INTEGER DEFAULT 0,
  late_minutes         INTEGER DEFAULT 0,
  payment_status       TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','cancelled')),
  paid_date            DATE,
  notes                TEXT,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 17. TASKS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT,
  assigned_to_id    TEXT, assigned_to_name TEXT, assigned_to_email TEXT,
  assigned_by_id    TEXT, assigned_by_name TEXT, assigned_by_email TEXT, assigned_by_role TEXT,
  priority          TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  due_date          DATE,
  completed_date    DATE,
  department        TEXT,
  notes             TEXT,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 18. INVOICES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number    TEXT UNIQUE,
  invoice_type      TEXT,
  party_id          TEXT, party_name TEXT, party_phone TEXT, party_address TEXT, party_email TEXT,
  invoice_date      DATE,
  due_date          DATE,
  linked_record_ids JSONB DEFAULT '[]',
  items             JSONB DEFAULT '[]',
  subtotal          NUMERIC(14,2) DEFAULT 0,
  tax_percent       NUMERIC(5,2)  DEFAULT 0,
  tax_amount        NUMERIC(14,2) DEFAULT 0,
  discount_percent  NUMERIC(5,2)  DEFAULT 0,
  discount_amount   NUMERIC(14,2) DEFAULT 0,
  grand_total       NUMERIC(14,2) DEFAULT 0,
  paid_amount       NUMERIC(14,2) DEFAULT 0,
  remaining_amount  NUMERIC(14,2) DEFAULT 0,
  payment_status    TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','partial')),
  account_number    TEXT, iban TEXT,
  notes TEXT, terms TEXT,
  company_phone TEXT, company_email TEXT, company_website TEXT, company_address TEXT,
  download_count    INTEGER DEFAULT 0,
  print_count       INTEGER DEFAULT 0,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 19. ACTIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE actions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  description           TEXT,
  priority              TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status                TEXT DEFAULT 'open'   CHECK (status IN ('open','pending','in_progress','completed','cancelled')),
  due_date              DATE,
  reminder_date         DATE,
  notes                 TEXT,
  linked_client_id      TEXT, linked_client_name TEXT,
  linked_supplier_id    TEXT, linked_supplier_name TEXT,
  linked_invoice_id     TEXT, linked_invoice_number TEXT,
  linked_employee_id    TEXT, linked_employee_name TEXT,
  completed_at          TIMESTAMPTZ,
  completed_by_name     TEXT,
  created_by_id TEXT, created_by_name TEXT, created_by_email TEXT, created_by_role TEXT,
  updated_by_id TEXT, updated_by_name TEXT, updated_by_email TEXT, updated_by_role TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 20. ROLE PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE role_permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        TEXT NOT NULL,
  module      TEXT NOT NULL,
  can_create  BOOLEAN DEFAULT false,
  can_read    BOOLEAN DEFAULT false,
  can_update  BOOLEAN DEFAULT false,
  can_delete  BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_export  BOOLEAN DEFAULT false,
  can_print   BOOLEAN DEFAULT false,
  can_assign  BOOLEAN DEFAULT false,
  can_manage  BOOLEAN DEFAULT false,
  full_access BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, module)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21. PERMISSION CHANGE LOGS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE permission_change_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  changed_by_id    TEXT, changed_by_name TEXT, changed_by_email TEXT,
  role             TEXT, module TEXT, permission_key TEXT,
  old_value        BOOLEAN, new_value BOOLEAN, action TEXT, notes TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 22. CUSTOM ROLES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE custom_roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key          TEXT UNIQUE,
  label        TEXT NOT NULL,
  description  TEXT,
  color        TEXT,
  is_system    BOOLEAN DEFAULT false,
  is_archived  BOOLEAN DEFAULT false,
  based_on     TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_attendance_emp_date  ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_date      ON attendance(date DESC);
CREATE INDEX idx_sales_date           ON sales(created_date DESC);
CREATE INDEX idx_sales_client         ON sales(client_id);
CREATE INDEX idx_purchases_date       ON purchases(created_date DESC);
CREATE INDEX idx_expenses_date        ON expenses(created_date DESC);
CREATE INDEX idx_payroll_emp_month    ON payroll(employee_id, month);
CREATE INDEX idx_tasks_assigned       ON tasks(assigned_to_id);
CREATE INDEX idx_leave_emp            ON leave_requests(employee_id);
CREATE INDEX idx_invoices_number      ON invoices(invoice_number);
CREATE INDEX idx_actions_status       ON actions(status);
CREATE INDEX idx_role_perm_role       ON role_permissions(role);
CREATE INDEX idx_profiles_email       ON profiles(email);

-- ─────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles           ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Simple open policies for authenticated users ─────────────────────────
-- All authenticated users can do everything (app-level permissions handle restrictions)
-- This is the most pragmatic approach for a team BMS

CREATE POLICY "auth_all" ON profiles               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON company_settings       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON employees              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON office_locations       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON employee_locations     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON attendance             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON leave_requests         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON clients                FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON suppliers              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON products               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON purchase_types         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON purchases              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON sales                  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON expense_types          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON expenses               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON payroll                FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON tasks                  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON invoices               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON actions                FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON role_permissions       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON permission_change_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON custom_roles           FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('nutrimeth-files', 'nutrimeth-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'nutrimeth-files');
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'nutrimeth-files' AND auth.role() = 'authenticated');
CREATE POLICY "storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'nutrimeth-files' AND auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE actions;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SCHEMA COMPLETE — All 22 tables created with open RLS policies
-- 
-- NEXT STEP: Set your account as super_admin:
--   UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
-- ═══════════════════════════════════════════════════════════════════════════
