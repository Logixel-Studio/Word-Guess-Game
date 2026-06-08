import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrencyProvider } from '@/lib/CurrencyContext';
import { PermissionsProvider } from '@/lib/PermissionsContext';

import Login from '@/pages/Login';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Suppliers from '@/pages/Suppliers';
import Purchasing from '@/pages/Purchasing';
import Expenses from '@/pages/Expenses';
import Products from '@/pages/Products';
import Sales from '@/pages/Sales';
import Payments from '@/pages/Payments';
import Stock from '@/pages/Stock';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Employees from '@/pages/Employees';
import Attendance from '@/pages/Attendance';
import PayrollPage from '@/pages/PayrollPage';
import Tasks from '@/pages/Tasks';
import HRM from '@/pages/HRM';
import MyAttendance from '@/pages/employee/MyAttendance';
import MyTasks from '@/pages/employee/MyTasks';
import MyPayroll from '@/pages/employee/MyPayroll';
import MyLeaves from '@/pages/employee/MyLeaves';
import UserManagement from '@/pages/admin/UserManagement';
import OfficeLocations from '@/pages/OfficeLocations';
import ActivityLogs from '@/pages/ActivityLogs';
import Reports from '@/pages/Reports';
import Permissions from '@/pages/Permissions';
import Invoices from '@/pages/Invoices';
import ActionCenter from '@/pages/ActionCenter';

// ── Guard: redirect unauthenticated users to /login ────────────────────────
function RequireAuth({ children }) {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading NUTRIMETH...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

const AuthenticatedApp = () => (
  <RequireAuth>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/"                 element={<Dashboard />} />
        <Route path="/clients"          element={<Clients />} />
        <Route path="/suppliers"        element={<Suppliers />} />
        <Route path="/purchasing"       element={<Purchasing />} />
        <Route path="/expenses"         element={<Expenses />} />
        <Route path="/products"         element={<Products />} />
        <Route path="/sales"            element={<Sales />} />
        <Route path="/payments"         element={<Payments />} />
        <Route path="/stock"            element={<Stock />} />
        <Route path="/employees"        element={<Employees />} />
        <Route path="/attendance"       element={<Attendance />} />
        <Route path="/payroll"          element={<PayrollPage />} />
        <Route path="/tasks"            element={<Tasks />} />
        <Route path="/hrm"              element={<HRM />} />
        <Route path="/my-attendance"    element={<MyAttendance />} />
        <Route path="/my-tasks"         element={<MyTasks />} />
        <Route path="/my-payroll"       element={<MyPayroll />} />
        <Route path="/my-leaves"        element={<MyLeaves />} />
        <Route path="/user-management"  element={<UserManagement />} />
        <Route path="/office-locations" element={<OfficeLocations />} />
        <Route path="/activity-logs"    element={<ActivityLogs />} />
        <Route path="/reports"          element={<Reports />} />
        <Route path="/permissions"      element={<Permissions />} />
        <Route path="/invoices"         element={<Invoices />} />
        <Route path="/action-center"    element={<ActionCenter />} />
        <Route path="/settings"         element={<Settings />} />
        <Route path="/profile"          element={<Profile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  </RequireAuth>
);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CurrencyProvider>
          <PermissionsProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*"     element={<AuthenticatedApp />} />
              </Routes>
            </Router>
          </PermissionsProvider>
          <Toaster />
        </CurrencyProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
