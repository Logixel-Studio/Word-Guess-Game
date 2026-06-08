import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Activity, Users, DollarSign, Package, Clock, MapPin, CheckSquare, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(dateStr);
}

function buildActivityFeed(sales, purchases, expenses, attendance, tasks, leaves, payrolls, employees) {
  const events = [];

  sales.slice(0, 30).forEach(s => events.push({
    id: 'sale-' + s.id, type: 'sale', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10',
    title: `New sale recorded`, subtitle: `${s.client_name || 'Client'} — ${s.total ? 'Rs ' + Number(s.total).toLocaleString() : ''}`,
    date: s.created_date, badge: 'Sales', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }));

  purchases.slice(0, 20).forEach(p => events.push({
    id: 'pur-' + p.id, type: 'purchase', icon: Package, color: 'text-blue-600', bg: 'bg-blue-500/10',
    title: `Purchase added`, subtitle: `${p.supplier_name || 'Supplier'} — ${p.purchase_type_name || ''}`,
    date: p.created_date, badge: 'Purchase', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  }));

  expenses.slice(0, 20).forEach(e => events.push({
    id: 'exp-' + e.id, type: 'expense', icon: DollarSign, color: 'text-red-600', bg: 'bg-red-500/10',
    title: `Expense recorded`, subtitle: `${e.expense_type_name || 'Expense'} — ${e.total ? 'Rs ' + Number(e.total).toLocaleString() : ''}`,
    date: e.created_date, badge: 'Expense', badgeColor: 'bg-red-50 text-red-700 border-red-200',
  }));

  attendance.slice(0, 50).forEach(a => events.push({
    id: 'att-' + a.id, type: 'attendance', icon: a.check_in_lat ? MapPin : Clock, color: 'text-primary', bg: 'bg-primary/10',
    title: `${a.employee_name} checked in`, subtitle: `${a.date} at ${a.check_in || '—'}${a.check_in_lat ? ' · GPS verified' : ''}`,
    date: a.created_date, badge: a.check_in_lat ? 'GPS' : 'Attendance', badgeColor: 'bg-primary/10 text-primary border-primary/20',
  }));

  tasks.slice(0, 20).forEach(t => events.push({
    id: 'task-' + t.id, type: 'task', icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-500/10',
    title: `Task ${t.status === 'done' ? 'completed' : 'created'}`, subtitle: `${t.title} — assigned to ${t.assigned_to_name || 'N/A'}`,
    date: t.created_date, badge: 'Task', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  }));

  leaves.slice(0, 20).forEach(l => events.push({
    id: 'leave-' + l.id, type: 'leave', icon: CalendarOff, color: 'text-amber-600', bg: 'bg-amber-500/10',
    title: `Leave request — ${l.status}`, subtitle: `${l.employee_name} · ${l.leave_type} · ${l.days} day(s)`,
    date: l.created_date, badge: 'Leave', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  }));

  payrolls.slice(0, 10).forEach(p => events.push({
    id: 'pay-' + p.id, type: 'payroll', icon: DollarSign, color: 'text-cyan-600', bg: 'bg-cyan-500/10',
    title: `Payroll processed`, subtitle: `${p.employee_name} — ${p.month} · Rs ${Number(p.net_salary || 0).toLocaleString()}`,
    date: p.created_date, badge: 'Payroll', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  }));

  employees.slice(0, 10).forEach(e => events.push({
    id: 'emp-' + e.id, type: 'employee', icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10',
    title: `Employee record created`, subtitle: `${e.full_name} — ${e.designation || e.role || 'Employee'}`,
    date: e.created_date, badge: 'Employee', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  }));

  return events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export default function ActivityLogs() {
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list('-created_date', 50) });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list('-created_date', 30) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-created_date', 30) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance-all'], queryFn: () => base44.entities.Attendance.list('-date', 100) });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 50) });
  const { data: leaves = [] } = useQuery({ queryKey: ['leaves'], queryFn: () => base44.entities.LeaveRequest.list('-created_date', 50) });
  const { data: payrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 50) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });

  const allEvents = useMemo(() =>
    buildActivityFeed(sales, purchases, expenses, attendance, tasks, leaves, payrolls, employees),
    [sales, purchases, expenses, attendance, tasks, leaves, payrolls, employees]
  );

  const filtered = typeFilter === 'all' ? allEvents : allEvents.filter(e => e.type === typeFilter);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = allEvents.filter(e => (e.date || '').startsWith(today)).length;
  const gpsCount = attendance.filter(a => a.check_in_lat && a.date === today).length;

  return (
    <div>
      <PageHeader title="Activity Logs" description="Real-time system-wide activity feed">
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
          <Activity className="w-3 h-3 mr-1" /> Live Feed
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Total Events" value={allEvents.length} icon={Activity} delay={0} />
        <SummaryCard title="Today's Events" value={todayCount} icon={Clock} delay={0.05} />
        <SummaryCard title="GPS Events (Today)" value={gpsCount} icon={MapPin} delay={0.1} />
        <SummaryCard title="Employees Tracked" value={employees.length} icon={Users} delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">System Activity Feed</h3>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="leave">Leaves</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative pl-4">
          {/* Timeline line */}
          <div className="absolute left-7 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {filtered.slice(0, 100).map((event, i) => {
              const Icon = event.icon;
              return (
                <motion.div key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="flex items-start gap-3 py-2.5 hover:bg-muted/30 rounded-lg px-2 transition-colors group"
                >
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10', event.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', event.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{event.title}</p>
                      <Badge variant="outline" className={cn('text-xs', event.badgeColor)}>{event.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {timeAgo(event.date)}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 group-hover:opacity-0 transition-opacity">
                    {timeAgo(event.date)}
                  </span>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No activity events found</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}