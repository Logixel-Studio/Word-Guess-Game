import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDueDateInfo, isOverdue } from '@/lib/dueDateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, Clock, Package, CreditCard, CheckCheck, MapPin, UserX, Zap, CalendarOff, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import { useCurrentUser } from '@/lib/useCurrentUser';

// ─── Builders per role ────────────────────────────────────────────────────────

function buildAdminNotifications(sales, purchases, expenses, products, attendance, leaves, payrolls) {
  const notifs = [];
  const today = new Date().toISOString().slice(0, 10);

  // Payment alerts
  [...sales].forEach(s => {
    if (s.payment_status === 'paid') return;
    const remaining = (s.total || 0) - (s.paid_amount || 0);
    if (s.due_date) {
      const info = getDueDateInfo(s.due_date);
      if (info) {
        const ov = isOverdue(s.due_date);
        notifs.push({ id: `sale-due-${s.id}`, type: ov ? 'overdue' : 'upcoming', icon: CreditCard, color: ov ? 'text-red-500' : 'text-amber-500', bg: ov ? 'bg-red-50' : 'bg-amber-50', title: ov ? 'Overdue Payment' : 'Upcoming Payment', message: `Sale to ${s.client_name} — ${info.label}`, amount: remaining, urgent: info.urgent });
      }
    }
  });
  [...purchases].forEach(p => {
    if (p.payment_status === 'paid') return;
    const remaining = (p.total || 0) - (p.paid_amount || 0);
    if (p.due_date) {
      const info = getDueDateInfo(p.due_date);
      if (info) {
        const ov = isOverdue(p.due_date);
        notifs.push({ id: `pur-due-${p.id}`, type: ov ? 'overdue' : 'upcoming', icon: CreditCard, color: ov ? 'text-red-500' : 'text-amber-500', bg: ov ? 'bg-red-50' : 'bg-amber-50', title: ov ? 'Supplier Payment Overdue' : 'Supplier Payment Due', message: `Pay ${p.supplier_name} — ${info.label}`, amount: remaining, urgent: info.urgent });
      }
    }
  });
  [...expenses].forEach(e => {
    if (e.payment_status === 'paid') return;
    const remaining = (e.total || 0) - (e.paid_amount || 0);
    if (e.due_date) {
      const info = getDueDateInfo(e.due_date);
      if (info) {
        const ov = isOverdue(e.due_date);
        notifs.push({ id: `exp-due-${e.id}`, type: ov ? 'overdue' : 'upcoming', icon: AlertTriangle, color: ov ? 'text-red-500' : 'text-amber-500', bg: ov ? 'bg-red-50' : 'bg-amber-50', title: ov ? 'Expense Overdue' : 'Expense Due', message: `${e.expense_type_name} — ${info.label}`, amount: remaining, urgent: info.urgent });
      }
    }
  });

  // Stock alerts
  products.forEach(p => {
    const qty = p.stock_qty || 0;
    if (qty === 0) notifs.push({ id: `stock-out-${p.id}`, icon: Package, color: 'text-red-500', bg: 'bg-red-50', title: 'Out of Stock', message: `${p.name} — No stock remaining`, urgent: true });
    else if (qty <= 10) notifs.push({ id: `stock-low-${p.id}`, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Low Stock Alert', message: `${p.name} — Only ${qty} remaining`, urgent: false });
  });

  // Today's absent / late
  const todayAtt = attendance.filter(a => a.date === today);
  todayAtt.filter(a => a.status === 'late').forEach(a => {
    notifs.push({ id: `late-${a.id}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Employee Late', message: `${a.employee_name} checked in late — ${a.late_minutes}m`, urgent: false });
  });

  // Pending leaves
  leaves.filter(l => l.status === 'pending').forEach(l => {
    notifs.push({ id: `leave-${l.id}`, icon: CalendarOff, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Pending Leave Request', message: `${l.employee_name} — ${l.leave_type} from ${formatDate(l.from_date)}`, urgent: false });
  });

  // Pending payroll
  payrolls.filter(p => p.payment_status === 'pending').forEach(p => {
    notifs.push({ id: `payroll-${p.id}`, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-50', title: 'Pending Payroll', message: `${p.employee_name} — ${p.month} payroll not paid`, urgent: false });
  });

  return notifs.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
}

function buildManagerNotifications(attendance, leaves, tasks) {
  const notifs = [];
  const today = new Date().toISOString().slice(0, 10);

  attendance.filter(a => a.date === today && a.status === 'late').forEach(a => {
    notifs.push({ id: `mgr-late-${a.id}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Team Member Late', message: `${a.employee_name} is late today — ${a.late_minutes}m`, urgent: false });
  });

  leaves.filter(l => l.status === 'pending').forEach(l => {
    notifs.push({ id: `mgr-leave-${l.id}`, icon: CalendarOff, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Leave Pending Approval', message: `${l.employee_name} — ${l.leave_type} (${l.days || 1}d)`, urgent: false });
  });

  const today_ = new Date().toISOString().slice(0, 10);
  tasks.filter(t => t.due_date && t.due_date < today_ && !['done', 'cancelled'].includes(t.status)).forEach(t => {
    notifs.push({ id: `mgr-task-${t.id}`, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', title: 'Task Overdue', message: `${t.title} — assigned to ${t.assigned_to_name}`, urgent: true });
  });

  return notifs.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
}

function buildEmployeeNotifications(empAttendance, empLeaves, empTasks, empPayrolls) {
  const notifs = [];
  const today = new Date().toISOString().slice(0, 10);

  const todayAtt = empAttendance.find(a => a.date === today);
  if (todayAtt?.status === 'late') {
    notifs.push({ id: 'my-late', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', title: 'You Were Late Today', message: `${todayAtt.late_minutes} minutes late`, urgent: true });
  }
  if (todayAtt?.overtime_hours > 0) {
    notifs.push({ id: 'my-ot', icon: Zap, color: 'text-primary', bg: 'bg-primary/10', title: 'Overtime Recorded', message: `${Number(todayAtt.overtime_hours).toFixed(1)}h overtime today`, urgent: false });
  }
  if (todayAtt?.check_in && !todayAtt?.check_out) {
    notifs.push({ id: 'my-checkout', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Checked In', message: `GPS check-in at ${todayAtt.check_in} — don't forget to check out`, urgent: false });
  }
  if (!todayAtt) {
    notifs.push({ id: 'my-absent', icon: UserX, color: 'text-red-500', bg: 'bg-red-50', title: 'No Attendance Today', message: `You haven't marked attendance for today`, urgent: true });
  }

  empLeaves.filter(l => l.status === 'approved' && l.from_date > today).forEach(l => {
    notifs.push({ id: `my-leave-${l.id}`, icon: CalendarOff, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Leave Approved', message: `${l.leave_type} leave from ${formatDate(l.from_date)}`, urgent: false });
  });
  empLeaves.filter(l => l.status === 'rejected').slice(0, 2).forEach(l => {
    notifs.push({ id: `my-leave-rej-${l.id}`, icon: CalendarOff, color: 'text-red-500', bg: 'bg-red-50', title: 'Leave Rejected', message: `${l.leave_type} leave request rejected`, urgent: false });
  });

  empTasks.filter(t => t.due_date && t.due_date < today && !['done', 'cancelled'].includes(t.status)).forEach(t => {
    notifs.push({ id: `my-task-${t.id}`, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', title: 'Overdue Task', message: `"${t.title}" was due on ${formatDate(t.due_date)}`, urgent: true });
  });

  empPayrolls.filter(p => p.payment_status === 'paid').slice(0, 1).forEach(p => {
    notifs.push({ id: `my-pay-${p.id}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Salary Processed', message: `${p.month} salary has been paid`, urgent: false });
  });

  return notifs.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationPanel() {
  const { formatCurrency } = useCurrency();
  const user = useCurrentUser();
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); } catch { return new Set(); }
  });
  const [open, setOpen] = useState(false);

  const role = user?.role || 'employee';
  const isAdminLike = ['super_admin', 'admin'].includes(role);
  const isManagerLike = ['manager', 'hr_manager'].includes(role);
  const isEmployeeLike = ['employee', 'inventory_manager', 'sales_manager', 'accountant'].includes(role);

  // Admin / Super Admin data
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list(), enabled: isAdminLike, refetchInterval: 60000 });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list(), enabled: isAdminLike, refetchInterval: 60000 });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list(), enabled: isAdminLike, refetchInterval: 60000 });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), enabled: isAdminLike, refetchInterval: 60000 });
  const { data: allPayrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 100), enabled: isAdminLike, refetchInterval: 120000 });

  // Manager / Admin shared data
  const { data: allAttendance = [] } = useQuery({ queryKey: ['attendance-today'], queryFn: () => base44.entities.Attendance.filter({ date: new Date().toISOString().slice(0, 10) }), enabled: isAdminLike || isManagerLike, refetchInterval: 60000 });
  const { data: allLeaves = [] } = useQuery({ queryKey: ['leaves-pending'], queryFn: () => base44.entities.LeaveRequest.filter({ status: 'pending' }), enabled: isAdminLike || isManagerLike, refetchInterval: 60000 });
  const { data: allTasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list(), enabled: isManagerLike, refetchInterval: 120000 });

  // Employee-specific data
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list(), enabled: isEmployeeLike });
  const myEmployee = useMemo(() => {
    if (!user || !isEmployeeLike) return null;
    return employees.find(e => e.email === user.email || e.full_name === user.full_name) || null;
  }, [user, employees, isEmployeeLike]);
  const empId = myEmployee?.id;

  const { data: myAttendance = [] } = useQuery({ queryKey: ['my-att-notif', empId], queryFn: () => base44.entities.Attendance.filter({ employee_id: empId }, '-date', 30), enabled: !!empId && isEmployeeLike, refetchInterval: 60000 });
  const { data: myLeaves = [] } = useQuery({ queryKey: ['my-leaves-notif', empId], queryFn: () => base44.entities.LeaveRequest.filter({ employee_id: empId }, '-created_date', 10), enabled: !!empId && isEmployeeLike });
  const { data: myTasks = [] } = useQuery({ queryKey: ['my-tasks-notif', empId], queryFn: () => base44.entities.Task.filter({ assigned_to_id: empId }), enabled: !!empId && isEmployeeLike });
  const { data: myPayrolls = [] } = useQuery({ queryKey: ['my-payrolls-notif', empId], queryFn: () => base44.entities.Payroll.filter({ employee_id: empId }, '-month', 6), enabled: !!empId && isEmployeeLike });

  const notifications = useMemo(() => {
    if (isAdminLike) return buildAdminNotifications(sales, purchases, expenses, products, allAttendance, allLeaves, allPayrolls);
    if (isManagerLike) return buildManagerNotifications(allAttendance, allLeaves, allTasks);
    return buildEmployeeNotifications(myAttendance, myLeaves, myTasks, myPayrolls);
  }, [role, sales, purchases, expenses, products, allAttendance, allLeaves, allPayrolls, allTasks, myAttendance, myLeaves, myTasks, myPayrolls]);

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
    localStorage.setItem('notif_read', JSON.stringify([...all]));
  };

  const markRead = (id) => {
    const updated = new Set([...readIds, id]);
    setReadIds(updated);
    localStorage.setItem('notif_read', JSON.stringify([...updated]));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] sm:w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground capitalize">{role?.replace('_', ' ')} · {unread} unread</p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={markAllRead}>
              <CheckCheck className="w-3 h-3" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-1 opacity-60">You're all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const isRead = readIds.has(n.id);
                const NIcon = n.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      !isRead && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', n.bg)}>
                      <NIcon className={cn('w-3.5 h-3.5', n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        {n.urgent && <Badge variant="outline" className="text-[10px] h-4 px-1 text-red-600 border-red-300">urgent</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      {n.amount > 0 && (
                        <p className="text-xs font-medium text-foreground mt-0.5">{formatCurrency(n.amount)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}