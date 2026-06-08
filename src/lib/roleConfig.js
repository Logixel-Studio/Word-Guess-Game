/**
 * Role-based navigation and access configuration
 */

import {
  LayoutDashboard, Users, Truck, ShoppingCart, Receipt,
  Package, TrendingUp, CreditCard, Settings, UserCircle,
  Warehouse, UserSquare2, ClipboardList, DollarSign, CheckSquare,
  CalendarOff, Shield, Building2, BarChart3, FileText, MapPin,
  Bell, Activity, Navigation, Factory, Beaker, GitBranch,
  Layers, FolderOpen, Zap, Globe, ClipboardCheck, KeyRound, ScrollText, Target
} from 'lucide-react';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  HR_MANAGER: 'hr_manager',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_MANAGER: 'sales_manager',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  hr_manager: 'HR Manager',
  accountant: 'Accountant',
  inventory_manager: 'Inventory Manager',
  sales_manager: 'Sales Manager',
  employee: 'Employee',
};

export const ROLE_COLORS = {
  super_admin: 'text-purple-500',
  admin: 'text-primary',
  manager: 'text-blue-500',
  hr_manager: 'text-pink-500',
  accountant: 'text-emerald-500',
  inventory_manager: 'text-amber-500',
  sales_manager: 'text-cyan-500',
  employee: 'text-slate-400',
};

export const NAV_GROUPS = {
  super_admin: [
    {
      label: 'Global',
      items: [
        { path: '/', label: 'Global Dashboard', icon: LayoutDashboard },
        { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
        { path: '/activity-logs', label: 'Activity Logs', icon: Activity },
      ]
    },
    {
      label: 'Management',
      items: [
        { path: '/user-management', label: 'User Management', icon: Users },
        { path: '/office-locations', label: 'GPS Locations', icon: Navigation },
        { path: '/settings', label: 'Company Settings', icon: Building2 },
      ]
    },
    {
      label: 'Operations',
      items: [
        { path: '/clients', label: 'Clients', icon: Users },
        { path: '/suppliers', label: 'Suppliers', icon: Truck },
        { path: '/sales', label: 'Sales', icon: TrendingUp },
        { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
        { path: '/expenses', label: 'Expenses', icon: Receipt },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/invoices', label: 'Invoices', icon: ScrollText },
      ]
    },
    {
      label: 'Inventory & Production',
      items: [
        { path: '/products', label: 'Products', icon: Package },
        { path: '/stock', label: 'Stock / Inventory', icon: Warehouse },
      ]
    },
    {
      label: 'HRM',
      items: [
        { path: '/employees', label: 'Employees', icon: UserSquare2 },
        { path: '/attendance', label: 'Attendance', icon: ClipboardList },
        { path: '/payroll', label: 'Payroll', icon: DollarSign },
        { path: '/hrm', label: 'Leave Requests', icon: CalendarOff },
        { path: '/tasks', label: 'Tasks', icon: CheckSquare },
      ]
    },
    {
      label: 'Action Center',
      items: [
        { path: '/action-center', label: 'Action Center', icon: Target },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/permissions', label: 'Permissions', icon: KeyRound },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  admin: [
    {
      label: 'Business',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
        { path: '/clients', label: 'Clients', icon: Users },
        { path: '/suppliers', label: 'Suppliers', icon: Truck },
        { path: '/sales', label: 'Sales', icon: TrendingUp },
        { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
        { path: '/expenses', label: 'Expenses', icon: Receipt },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/invoices', label: 'Invoices', icon: ScrollText },
      ]
    },
    {
      label: 'Inventory',
      items: [
        { path: '/products', label: 'Products', icon: Package },
        { path: '/stock', label: 'Stock', icon: Warehouse },
      ]
    },
    {
      label: 'HRM',
      items: [
        { path: '/employees', label: 'Employees', icon: UserSquare2 },
        { path: '/attendance', label: 'Attendance', icon: ClipboardList },
        { path: '/payroll', label: 'Payroll', icon: DollarSign },
        { path: '/hrm', label: 'Leave Requests', icon: CalendarOff },
        { path: '/tasks', label: 'Tasks', icon: CheckSquare },
        { path: '/office-locations', label: 'GPS Locations', icon: Navigation },
      ]
    },
    {
      label: 'Action Center',
      items: [
        { path: '/action-center', label: 'Action Center', icon: Target },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/user-management', label: 'User Management', icon: Shield },
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  manager: [
    {
      label: 'Overview',
      items: [
        { path: '/', label: 'Team Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Team',
      items: [
        { path: '/attendance', label: 'Team Attendance', icon: ClipboardList },
        { path: '/tasks', label: 'Team Tasks', icon: CheckSquare },
        { path: '/hrm', label: 'Leave Requests', icon: CalendarOff },
        { path: '/employees', label: 'Employees', icon: UserSquare2 },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  hr_manager: [
    {
      label: 'HR Overview',
      items: [
        { path: '/', label: 'HR Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Workforce',
      items: [
        { path: '/employees', label: 'Employees', icon: UserSquare2 },
        { path: '/attendance', label: 'Attendance', icon: ClipboardList },
        { path: '/hrm', label: 'Leave Requests', icon: CalendarOff },
        { path: '/office-locations', label: 'GPS Locations', icon: Navigation },
      ]
    },
    {
      label: 'Payroll',
      items: [
        { path: '/payroll', label: 'Payroll', icon: DollarSign },
        { path: '/tasks', label: 'Tasks', icon: CheckSquare },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  accountant: [
    {
      label: 'Finance',
      items: [
        { path: '/', label: 'Financial Dashboard', icon: LayoutDashboard },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/sales', label: 'Sales', icon: TrendingUp },
        { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
        { path: '/expenses', label: 'Expenses', icon: Receipt },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/payroll', label: 'Payroll', icon: DollarSign },
        { path: '/invoices', label: 'Invoices', icon: ScrollText },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  inventory_manager: [
    {
      label: 'Inventory',
      items: [
        { path: '/', label: 'Stock Dashboard', icon: LayoutDashboard },
        { path: '/products', label: 'Products', icon: Package },
        { path: '/stock', label: 'Stock', icon: Warehouse },
        { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  sales_manager: [
    {
      label: 'Sales',
      items: [
        { path: '/', label: 'Sales Dashboard', icon: LayoutDashboard },
        { path: '/clients', label: 'Clients', icon: Users },
        { path: '/sales', label: 'Sales', icon: TrendingUp },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/invoices', label: 'Invoices', icon: ScrollText },
      ]
    },
    {
      label: 'System',
      items: [
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],

  employee: [
    {
      label: 'My Space',
      items: [
        { path: '/', label: 'My Dashboard', icon: LayoutDashboard },
        { path: '/my-attendance', label: 'GPS Attendance', icon: Navigation },
        { path: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
        { path: '/my-payroll', label: 'My Payslips', icon: DollarSign },
        { path: '/my-leaves', label: 'My Leaves', icon: CalendarOff },
        { path: '/profile', label: 'Profile', icon: UserCircle },
      ]
    },
  ],
};

export function getUserNavGroups(userRole) {
  return NAV_GROUPS[userRole] || NAV_GROUPS.employee;
}

export function canAccess(userRole, path) {
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) return true;
  const groups = getUserNavGroups(userRole);
  const allPaths = groups.flatMap(g => g.items.map(i => i.path));
  return allPaths.includes(path);
}