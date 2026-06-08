import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useCurrency } from '@/lib/CurrencyContext';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/formatters';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Clock, CheckSquare, DollarSign, Calendar,
  TrendingUp, AlertCircle, CheckCircle, XCircle,
  ClipboardList, ArrowRight, User
} from 'lucide-react';

const statusColor = {
  present:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent:    'bg-red-50 text-red-700 border-red-200',
  late:      'bg-amber-50 text-amber-700 border-amber-200',
  half_day:  'bg-blue-50 text-blue-700 border-blue-200',
  on_leave:  'bg-purple-50 text-purple-700 border-purple-200',
};

const taskStatusColor = {
  pending:     'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:   'bg-muted text-muted-foreground line-through',
};

const priorityColor = {
  low:    'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high:   'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function EmployeeDashboard() {
  const user = useCurrentUser();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [myEmployee, setMyEmployee] = useState(null);

  // Fetch all base data
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Resolve employee profile from current user email
  useEffect(() => {
    if (user && employees.length > 0) {
      const emp = employees.find(e => e.email === user.email);
      setMyEmployee(emp || null);
    }
  }, [user, employees]);

  // Attendance — current month
  const { data: attendance = [] } = useQuery({
    queryKey: ['my-attendance', myEmployee?.id],
    queryFn: () =>
      myEmployee
        ? base44.entities.Attendance.filter({ employee_id: myEmployee.id }, '-date', 60)
        : Promise.resolve([]),
    enabled: !!myEmployee,
  });

  // Tasks assigned to me
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', myEmployee?.id],
    queryFn: () =>
      myEmployee
        ? base44.entities.Task.filter({ assigned_to_id: myEmployee.id }, '-created_date', 20)
        : Promise.resolve([]),
    enabled: !!myEmployee,
  });

  // Latest payroll
  const { data: payrolls = [] } = useQuery({
    queryKey: ['my-payroll', myEmployee?.id],
    queryFn: () =>
      myEmployee
        ? base44.entities.Payroll.filter({ employee_id: myEmployee.id }, '-created_date', 3)
        : Promise.resolve([]),
    enabled: !!myEmployee,
  });

  // Leave requests
  const { data: leaves = [] } = useQuery({
    queryKey: ['my-leaves', myEmployee?.id],
    queryFn: () =>
      myEmployee
        ? base44.entities.LeaveRequest.filter({ employee_id: myEmployee.id }, '-created_date', 10)
        : Promise.resolve([]),
    enabled: !!myEmployee,
  });

  // ── Computed stats ──────────────────────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const monthAttendance = useMemo(() =>
    attendance.filter(a => a.date?.startsWith(currentMonth)),
    [attendance, currentMonth]
  );

  const presentDays  = monthAttendance.filter(a => a.status === 'present').length;
  const absentDays   = monthAttendance.filter(a => a.status === 'absent').length;
  const lateDays     = monthAttendance.filter(a => a.status === 'late').length;
  const leaveDays    = monthAttendance.filter(a => a.status === 'on_leave').length;

  const activeTasks  = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const urgentTasks  = activeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');

  const latestPayroll = payrolls[0] || null;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  const summaryCards = [
    {
      title: 'Present This Month',
      value: presentDays,
      icon: CheckCircle,
      delay: 0,
      color: 'text-emerald-600',
    },
    {
      title: 'Late Days',
      value: lateDays,
      icon: Clock,
      delay: 0.05,
      color: 'text-amber-600',
    },
    {
      title: 'Active Tasks',
      value: activeTasks.length,
      icon: CheckSquare,
      delay: 0.1,
    },
    {
      title: 'Net Salary',
      value: latestPayroll ? formatCurrency(latestPayroll.net_salary || 0) : '—',
      icon: DollarSign,
      delay: 0.15,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Employee'} 👋`}
        description="Your personal dashboard — attendance, tasks, payroll and more"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map(card => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Recent Attendance ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Attendance
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-attendance')}
                className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {monthAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No attendance records this month</p>
              ) : (
                monthAttendance.slice(0, 7).map(a => (
                  <div key={a.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-24">{formatDate(a.date)}</span>
                      {a.check_in && (
                        <span className="text-xs text-muted-foreground">
                          {a.check_in}{a.check_out ? ` – ${a.check_out}` : ''}
                        </span>
                      )}
                    </div>
                    <Badge className={cn('text-xs border capitalize', statusColor[a.status] || 'bg-muted text-muted-foreground')}>
                      {a.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── My Tasks ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" /> My Tasks
                {urgentTasks.length > 0 && (
                  <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">
                    {urgentTasks.length} urgent
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-tasks')}
                className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active tasks 🎉</p>
              ) : (
                activeTasks.slice(0, 6).map(t => (
                  <div key={t.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge className={cn('text-[10px] shrink-0', priorityColor[t.priority])}>
                        {t.priority}
                      </Badge>
                      <span className="text-sm truncate">{t.title}</span>
                    </div>
                    <Badge className={cn('text-xs border capitalize ml-2 shrink-0',
                      taskStatusColor[t.status] || 'bg-muted text-muted-foreground')}>
                      {t.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Latest Payroll ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Latest Payroll
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-payroll')}
                className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {!latestPayroll ? (
                <p className="text-sm text-muted-foreground text-center py-6">No payroll records yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Month</span>
                    <span className="text-sm font-medium">{latestPayroll.month}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Basic Salary</span>
                    <span className="text-sm">{formatCurrency(latestPayroll.basic_salary || 0)}</span>
                  </div>
                  {(latestPayroll.overtime_amount || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overtime</span>
                      <span className="text-sm text-emerald-600">+{formatCurrency(latestPayroll.overtime_amount)}</span>
                    </div>
                  )}
                  {(latestPayroll.bonus || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bonus</span>
                      <span className="text-sm text-emerald-600">+{formatCurrency(latestPayroll.bonus)}</span>
                    </div>
                  )}
                  {(latestPayroll.deductions || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Deductions</span>
                      <span className="text-sm text-red-500">-{formatCurrency(latestPayroll.deductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t font-semibold">
                    <span className="text-sm">Net Salary</span>
                    <span className="text-base text-primary">{formatCurrency(latestPayroll.net_salary || 0)}</span>
                  </div>
                  <Badge className={cn('text-xs',
                    latestPayroll.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {latestPayroll.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Leave Requests ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Leave Requests
                {pendingLeaves > 0 && (
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                    {pendingLeaves} pending
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-leaves')}
                className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No leave requests</p>
              ) : (
                leaves.slice(0, 5).map(l => (
                  <div key={l.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{l.leave_type || 'Leave'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(l.from_date)} → {formatDate(l.to_date)}
                        {l.days ? ` (${l.days}d)` : ''}
                      </p>
                    </div>
                    <Badge className={cn('text-xs border capitalize', {
                      'bg-amber-50 text-amber-700 border-amber-200':   l.status === 'pending',
                      'bg-emerald-50 text-emerald-700 border-emerald-200': l.status === 'approved',
                      'bg-red-50 text-red-700 border-red-200':          l.status === 'rejected',
                      'bg-muted text-muted-foreground':                  l.status === 'cancelled',
                    })}>
                      {l.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Quick Links */}
      <motion.div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {[
          { label: 'My Attendance', icon: Clock,         path: '/my-attendance' },
          { label: 'My Tasks',      icon: CheckSquare,   path: '/my-tasks' },
          { label: 'My Payroll',    icon: DollarSign,    path: '/my-payroll' },
          { label: 'My Leaves',     icon: Calendar,      path: '/my-leaves' },
        ].map(({ label, icon: Icon, path }) => (
          <Button key={path} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs"
            onClick={() => navigate(path)}>
            <Icon className="w-5 h-5 text-primary" />
            {label}
          </Button>
        ))}
      </motion.div>
    </div>
  );
}
