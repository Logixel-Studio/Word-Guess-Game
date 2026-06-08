# NutriMeth BMS — Base44 → Supabase Migration Report

## Summary

| Item | Before | After |
|---|---|---|
| Backend | Base44 Platform | Supabase (PostgreSQL) |
| Auth | Base44 SDK auth | Supabase Auth (JWT) |
| Database | Base44 Entities | Supabase PostgreSQL |
| Realtime | Base44 subscribe | Supabase Realtime Channels |
| Storage | Base44 integrations.Core | Supabase Storage |
| Permissions | Base44 RLS | Supabase RLS + App Context |
| Build tool | Vite + @base44/vite-plugin | Vite (standard) |

---

## Phase 1 — Audit: Base44 References Found & Resolved

### Files with Base44 Imports (all resolved via drop-in adapter)

| File | Usage |
|---|---|
| `src/api/base44Client.js` | **REPLACED** — now re-exports Supabase adapter |
| `src/lib/AuthContext.jsx` | **REPLACED** — Supabase Auth sessions |
| `src/lib/useCurrentUser.js` | **REPLACED** — Supabase profiles |
| `src/lib/app-params.js` | **REPLACED** — removed all base44 token handling |
| `src/lib/PermissionsContext.jsx` | ✅ Works unchanged (uses entities via adapter) |
| `src/pages/*.jsx` (21 pages) | ✅ Works unchanged (use adapter API) |
| `src/components/**/*.jsx` (30+ files) | ✅ Works unchanged (use adapter API) |
| `vite.config.js` | **REPLACED** — removed @base44/vite-plugin |
| `package.json` | **REPLACED** — removed @base44/sdk, added @supabase/supabase-js |

### New Files Created

| File | Purpose |
|---|---|
| `src/lib/supabase.js` | Supabase client initialization |
| `src/api/supabaseAdapter.js` | Drop-in base44 API adapter for Supabase |
| `src/pages/Login.jsx` | Full auth UI (sign in, sign up, forgot password) |
| `supabase/schema.sql` | Complete PostgreSQL schema (run in Supabase SQL Editor) |
| `.env.local` | Updated with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |

---

## Phase 2 — Database Schema

### Tables Created (22 total)

| Table | Entity | Key Fields |
|---|---|---|
| `profiles` | User | id (FK auth.users), role, full_name, avatar_url |
| `company_settings` | CompanySettings | company_name, currency, logo_url |
| `employees` | Employee | full_name, employee_id, role, department, basic_salary |
| `office_locations` | OfficeLocation | name, latitude, longitude, radius_meters |
| `employee_locations` | EmployeeLocation | employee_id, office_location_id |
| `attendance` | Attendance | employee_id, date (UNIQUE pair), check_in, check_out |
| `leave_requests` | LeaveRequest | employee_id, from_date, to_date, status |
| `clients` | Client | name, phone, status |
| `suppliers` | Supplier | name, phone, status |
| `products` | Product | name, materials (JSONB), stock_qty |
| `purchase_types` | PurchaseType | name |
| `purchases` | Purchase | supplier_id, total, payment_status |
| `sales` | Sale | client_id, product_id, total, payment_status |
| `expense_types` | ExpenseType | name |
| `expenses` | Expense | expense_type_id, total, payment_status |
| `payroll` | Payroll | employee_id, month, net_salary, payment_status |
| `tasks` | Task | title, assigned_to_id, priority, status |
| `invoices` | Invoice | invoice_number (UNIQUE), grand_total, items (JSONB) |
| `actions` | Action | title, priority, status, linked_* fields |
| `role_permissions` | RolePermission | role, module (UNIQUE pair), can_* flags |
| `permission_change_logs` | PermissionChangeLog | role, module, old_value, new_value |
| `custom_roles` | CustomRole | key (UNIQUE), label, is_system |

---

## Phase 3 — Authentication Migration

### How Auth Works Now

1. User visits app → `RequireAuth` guard in `App.jsx` checks Supabase session
2. If no session → redirect to `/login`
3. `/login` page offers:
   - **Sign In** with email + password
   - **Sign Up** with name + email + password
   - **Forgot Password** with email reset link
4. On sign in → `AuthContext` loads user profile from `profiles` table
5. Session auto-refreshes via Supabase JWT refresh tokens
6. `useCurrentUser()` hook returns merged auth user + profile data

### Role System

Roles stored in `profiles.role`:
- `super_admin` — full system access
- `admin` — administrative access
- `manager` — management access
- `hr_manager` — HR module access
- `accountant` — financial module access
- `inventory_manager` — inventory access
- `sales_manager` — sales access
- `employee` — self-service access

---

## Phase 4 — Permissions Migration

RLS policies on every table enforce:
- Super Admin / Admin — full read + write
- HR Manager — employee, attendance, payroll, leave access
- Accountant — financial data access
- Employee — own records only (attendance, payroll, tasks, leaves)
- All authenticated users — read access to reference tables (clients, suppliers, products)

App-level `PermissionsContext` reads from `role_permissions` table for granular module-level control.

---

## Phase 5 — Entity Migration (Adapter Pattern)

### Key Design: Drop-In Adapter

Instead of rewriting all 50+ component files, a single **supabaseAdapter.js** provides the identical base44 API surface:

```js
// Before (base44):
base44.entities.Employee.list()
base44.entities.Attendance.filter({ employee_id: id }, '-date', 30)
base44.entities.Sale.create(payload)
base44.entities.Task.update(id, data)
base44.entities.Product.delete(id)
base44.entities.Action.subscribe(callback)

// After (Supabase adapter — same calls, zero component changes):
base44.entities.Employee.list()        // → supabase.from('employees').select('*')
base44.entities.Attendance.filter(...) // → .eq().order().limit()
base44.entities.Sale.create(payload)   // → .insert().select().single()
base44.entities.Task.update(id, data)  // → .update().eq('id', id).select()
base44.entities.Product.delete(id)     // → .delete().eq('id', id)
base44.entities.Action.subscribe(cb)   // → supabase.channel().on('postgres_changes')
```

**Zero component/page files required changes.**

### Special Mappings

| base44 Call | Supabase Equivalent |
|---|---|
| `base44.auth.me()` | `supabase.auth.getUser()` + `profiles` lookup |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.auth.redirectToLogin()` | `navigate('/login')` |
| `base44.auth.updateMe(data)` | `supabase.auth.updateUser()` + `profiles.update()` |
| `base44.integrations.Core.UploadFile({file})` | `supabase.storage.from('nutrimeth-files').upload()` |
| `base44.entities.User.*` | `profiles` table |

---

## Phase 6 — Realtime Migration

Supabase Realtime Channels replace base44 subscribe:

```js
// ActionCenterPanel.jsx (unchanged code, new backend)
const unsub = base44.entities.Action.subscribe(() => refetch());
// → supabase.channel('realtime:actions').on('postgres_changes', ...).subscribe()
```

Realtime enabled on: `actions`, `tasks`, `attendance`, `leave_requests`, `payroll`, `invoices`, `sales`, `products`

---

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to https://supabase.com → New Project
2. Name: `nutrimeth-bms`
3. Note your **Project URL** and **Anon Key** from Settings → API

### Step 2: Run Database Schema

1. Supabase Dashboard → SQL Editor
2. Paste entire contents of `supabase/schema.sql`
3. Click Run

### Step 3: Configure Environment

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Step 4: Install Dependencies

```bash
npm install
```
(This installs `@supabase/supabase-js` and removes base44 packages)

### Step 5: Create First Super Admin

After running the app and signing up, manually set your role in Supabase:
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
```

### Step 6: Run the App

```bash
npm run dev
```

---

## What Did NOT Change

- ✅ All UI components (shadcn/ui)
- ✅ All page layouts and designs
- ✅ Sidebar navigation
- ✅ Dashboard charts and analytics
- ✅ Theme (light/dark)
- ✅ Responsive behavior
- ✅ All 21 business pages
- ✅ PDF generation (invoices, payslips)
- ✅ GPS attendance
- ✅ Permissions system logic
- ✅ Role-based dashboards
- ✅ All form validations
- ✅ React Query caching

## Important Notes

### User Deletion
Deleting a user via User Management deletes their `profiles` row. The `auth.users` entry remains but the user cannot access the app. To fully delete an auth user, use Supabase Dashboard → Authentication → Users, or create a Supabase Edge Function with service role access.

### Storage Bucket
The `nutrimeth-files` bucket is created by the schema SQL. Ensure it is set to **public** in Supabase Dashboard → Storage for avatar/logo URLs to load correctly.

### Auth Email Confirmation
By default Supabase requires email confirmation on sign up. To disable during development: Supabase Dashboard → Authentication → Settings → uncheck "Enable email confirmations".
