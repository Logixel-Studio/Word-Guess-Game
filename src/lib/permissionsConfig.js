/**
 * Central permissions configuration for the Permissions Management Module
 */

export const SYSTEM_MODULES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Main dashboard and KPI overview', category: 'Core' },
  { key: 'clients', label: 'Clients', description: 'Client management and CRM', category: 'Sales' },
  { key: 'sales', label: 'Sales', description: 'Sales orders and revenue tracking', category: 'Sales' },
  { key: 'payments', label: 'Payments', description: 'Payment tracking and reconciliation', category: 'Finance' },
  { key: 'suppliers', label: 'Suppliers', description: 'Supplier management', category: 'Purchasing' },
  { key: 'purchasing', label: 'Purchasing', description: 'Purchase orders and procurement', category: 'Purchasing' },
  { key: 'expenses', label: 'Expenses', description: 'Expense management and tracking', category: 'Finance' },
  { key: 'products', label: 'Products', description: 'Product catalogue and pricing', category: 'Inventory' },
  { key: 'stock', label: 'Stock / Inventory', description: 'Inventory levels and stock management', category: 'Inventory' },
  { key: 'employees', label: 'Employees', description: 'Employee profiles and records', category: 'HRM' },
  { key: 'attendance', label: 'Attendance', description: 'Attendance records and reporting', category: 'HRM' },
  { key: 'gps_attendance', label: 'GPS Attendance', description: 'GPS-based check-in/check-out system', category: 'HRM' },
  { key: 'payroll', label: 'Payroll', description: 'Salary processing and payslips', category: 'HRM' },
  { key: 'leave_requests', label: 'Leave Requests', description: 'Leave management and approvals', category: 'HRM' },
  { key: 'tasks', label: 'Tasks', description: 'Task assignment and tracking', category: 'Operations' },
  { key: 'invoices', label: 'Invoices', description: 'Client and supplier invoice management', category: 'Finance' },
  { key: 'action_center', label: 'Action Center', description: 'Personal work reminders and follow-up actions', category: 'Operations' },
  { key: 'reports', label: 'Reports & Analytics', description: 'Business reports and analytics', category: 'Core' },
  { key: 'user_management', label: 'User Management', description: 'User accounts and access control', category: 'System' },
  { key: 'office_locations', label: 'GPS Locations', description: 'Office location and geofencing setup', category: 'System' },
  { key: 'settings', label: 'Company Settings', description: 'System-wide configuration', category: 'System' },
  { key: 'activity_logs', label: 'Activity Logs', description: 'System audit trail', category: 'System' },
  { key: 'permissions', label: 'Permissions', description: 'Role and permissions management', category: 'System' },
  { key: 'profile', label: 'Profile', description: 'User profile management', category: 'Core' },
];

export const PERMISSION_KEYS = [
  { key: 'can_read', label: 'Read', short: 'R', color: 'text-blue-500' },
  { key: 'can_create', label: 'Create', short: 'C', color: 'text-emerald-500' },
  { key: 'can_update', label: 'Update', short: 'U', color: 'text-amber-500' },
  { key: 'can_delete', label: 'Delete', short: 'D', color: 'text-red-500' },
  { key: 'can_approve', label: 'Approve', short: 'A', color: 'text-purple-500' },
  { key: 'can_export', label: 'Export', short: 'E', color: 'text-cyan-500' },
  { key: 'can_print', label: 'Print', short: 'P', color: 'text-slate-400' },
  { key: 'can_assign', label: 'Assign', short: 'As', color: 'text-orange-500' },
  { key: 'can_manage', label: 'Manage', short: 'M', color: 'text-pink-500' },
  { key: 'full_access', label: 'Full Access', short: 'FA', color: 'text-primary' },
];

export const SYSTEM_ROLES = [
  { key: 'super_admin', label: 'Super Admin', color: 'text-purple-500', is_system: true },
  { key: 'admin', label: 'Admin', color: 'text-primary', is_system: true },
  { key: 'manager', label: 'Manager', color: 'text-blue-500', is_system: true },
  { key: 'hr_manager', label: 'HR Manager', color: 'text-pink-500', is_system: true },
  { key: 'accountant', label: 'Accountant', color: 'text-emerald-500', is_system: true },
  { key: 'inventory_manager', label: 'Inventory Manager', color: 'text-amber-500', is_system: true },
  { key: 'sales_manager', label: 'Sales Manager', color: 'text-cyan-500', is_system: true },
  { key: 'employee', label: 'Employee', color: 'text-slate-400', is_system: true },
];

export const MODULE_CATEGORIES = ['Core', 'Sales', 'Finance', 'Purchasing', 'Inventory', 'HRM', 'Operations', 'System'];

export const DEFAULT_PERMISSIONS = {
  super_admin: { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_export: true, can_print: true, can_assign: true, can_manage: true, full_access: true },
  admin: { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_export: true, can_print: true, can_assign: true, can_manage: true, full_access: false },
  manager: { can_read: true, can_create: false, can_update: true, can_delete: false, can_approve: true, can_export: true, can_print: true, can_assign: true, can_manage: false, full_access: false },
  hr_manager: { can_read: true, can_create: true, can_update: true, can_delete: false, can_approve: true, can_export: true, can_print: true, can_assign: true, can_manage: false, full_access: false },
  accountant: { can_read: true, can_create: true, can_update: true, can_delete: false, can_approve: false, can_export: true, can_print: true, can_assign: false, can_manage: false, full_access: false },
  inventory_manager: { can_read: true, can_create: true, can_update: true, can_delete: false, can_approve: false, can_export: true, can_print: true, can_assign: false, can_manage: false, full_access: false },
  sales_manager: { can_read: true, can_create: true, can_update: true, can_delete: false, can_approve: false, can_export: true, can_print: true, can_assign: false, can_manage: false, full_access: false },
  employee: { can_read: true, can_create: false, can_update: false, can_delete: false, can_approve: false, can_export: false, can_print: false, can_assign: false, can_manage: false, full_access: false },
};