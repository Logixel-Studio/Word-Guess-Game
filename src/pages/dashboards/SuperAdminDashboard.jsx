import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, DollarSign, Package, Activity, Shield,
  Database, AlertTriangle, Clock, MapPin, Wifi, WifiOff,
  UserCheck, UserX, CreditCard, BarChart3, Globe, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SuperAdminDashboard() {
  const { formatCurrency } = useCurrency();
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  const { data: payrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 200) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance-all'], queryFn: () => base44.entities.Attendance.list('-date', 500) });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 200) });
  const { data: leaves = [] } = useQuery({ queryKey: ['leaves'], queryFn: () => base44.entities.LeaveRequest.list('-created_date', 200) });

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalCosts = purchases.reduce((s, r) => s + (r.total || 0), 0) + expenses.reduce((s, r) => s + (r.total || 0), 0);
  const netProfit = totalRevenue - totalCosts;
  const payrollThisMonth = payrolls.filter(p => p.month === thisMonth).reduce((s, p) => s + (p.net_salary || 0), 0);

  const todayAtt = attendance.filter(a => a.date === today);
  const presentToday = todayAtt.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateToday = todayAtt.filter(a => a.status === 'late').length;
  const absentToday = employees.filter(e => e.status === 'active').length - presentToday;

  // GPS: employees with coordinates today
  const gpsCheckins = todayAtt.filter(a => a.check_in_lat && a.check_in_lng);
  const activeEmp = employees.filter(e => e.status === 'active').length;

  // Monthly aggregation
  const monthlyMap = {};
  sales.forEach(s => {
    const m = (s.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0 };
    monthlyMap[m].revenue += s.total || 0; monthlyMap[m].profit += s.profit || 0;
  });
  purchases.forEach(p => {
    const m = (p.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0 };
    monthlyMap[m].costs += p.total || 0;
  });
  expenses.forEach(e => {
    const m = (e.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0 };
    monthlyMap[m].costs += e.total || 0;
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);

  // Attendance trend (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const dayAtt = attendance.filter(a => a.date === ds);
    return { date: ds.slice(5), present: dayAtt.filter(a => a.status === 'present' || a.status === 'late').length, late: dayAtt.filter(a => a.status === 'late').length, absent: dayAtt.filter(a => a.status === 'absent').length };
  });

  // Payroll monthly trend
  const payrollMonthly = payrolls.reduce((acc, p) => {
    if (!acc[p.month]) acc[p.month] = 0;
    acc[p.month] += p.net_salary || 0;
    return acc;
  }, {});
  const payrollTrend = Object.entries(payrollMonthly).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, total]) => ({ month, total }));

  // OT analytics
  const totalOT = attendance.filter(a => a.date?.startsWith(thisMonth)).reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const totalLate = attendance.filter(a => a.date?.startsWith(thisMonth) && a.status === 'late').length;

  // Dept breakdown
  const deptMap = employees.reduce((acc, e) => { acc[e.department || 'Other'] = (acc[e.department || 'Other'] || 0) + 1; return acc; }, {});
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // Task stats
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const tasksOpen = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  const kpis = [
    { title: 'Active Employees', value: activeEmp, icon: Users, delay: 0 },
    { title: 'Present Today', value: presentToday, icon: UserCheck, delay: 0.03 },
    { title: 'Late Today', value: lateToday, icon: Clock, delay: 0.06 },
    { title: 'GPS Check-ins', value: gpsCheckins.length, icon: MapPin, delay: 0.09 },
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp, delay: 0.12 },
    { title: 'Net Profit', value: formatCurrency(netProfit), icon: DollarSign, delay: 0.15, trendUp: netProfit >= 0 },
    { title: 'Monthly Payroll', value: formatCurrency(payrollThisMonth), icon: CreditCard, delay: 0.18 },
    { title: 'OT Hours (Month)', value: totalOT.toFixed(1) + 'h', icon: Zap, delay: 0.21 },
    { title: 'Products', value: products.length, icon: Package, delay: 0.24 },
    { title: 'Low Stock', value: products.filter(p => p.status !== 'in_stock').length, icon: AlertTriangle, delay: 0.27 },
    { title: 'Open Tasks', value: tasksOpen, icon: BarChart3, delay: 0.30 },
    { title: 'Pending Leaves', value: leaves.filter(l => l.status === 'pending').length, icon: Activity, delay: 0.33 },
  ];

  return (
    <div>
      <PageHeader title="Global Command Center" description="Enterprise-wide system overview — Realtime">
        <Badge className="bg-purple-600 text-white"><Shield className="w-3 h-3 mr-1" /> Super Admin</Badge>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
          <Wifi className="w-3 h-3 mr-1" /> Live
        </Badge>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
        {kpis.map(k => <SummaryCard key={k.title} {...k} />)}
      </div>

      {/* Realtime Attendance Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Today's Attendance Status — {today}</h3>
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300"><Activity className="w-3 h-3 mr-1" />Live</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Present', count: presentToday, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Late', count: lateToday, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { label: 'Absent', count: Math.max(0, absentToday), color: 'text-red-600', bg: 'bg-red-500/10' },
            { label: 'GPS Tracked', count: gpsCheckins.length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          ].map(item => (
            <div key={item.label} className={cn('rounded-lg p-4 text-center', item.bg)}>
              <p className={cn('text-3xl font-bold', item.color)}>{item.count}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Revenue vs Costs — Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} width={72} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="costs" name="Costs" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5)/0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Staff by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No dept data</p>}
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Attendance — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="late" name="Late" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Payroll Expense Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} width={72} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" name="Payroll" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* System Metrics + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Database className="w-4 h-4" />System Health</h3>
          <div className="space-y-3">
            {[
              { label: 'Total DB Records', value: clients.length + suppliers.length + sales.length + purchases.length + expenses.length + employees.length, color: 'text-primary' },
              { label: 'Monthly Overtime Hrs', value: totalOT.toFixed(1) + 'h', color: 'text-amber-500' },
              { label: 'Late Events (Month)', value: totalLate, color: 'text-red-500' },
              { label: 'Tasks Completed', value: tasksDone, color: 'text-emerald-500' },
              { label: 'Pending Payroll', value: payrolls.filter(p => p.payment_status === 'pending').length, color: 'text-blue-500' },
              { label: 'Inventory Value', value: formatCurrency(products.reduce((s, p) => s + ((p.production_cost || 0) * (p.stock_qty || 0)), 0)), color: 'text-purple-500' },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={cn('text-sm font-bold', m.color)}>{m.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" />GPS Attendance Log — Today</h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {gpsCheckins.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{a.employee_name}</p>
                  <p className="text-xs text-muted-foreground">In: {a.check_in} · {a.check_in_lat?.toFixed(4)}, {a.check_in_lng?.toFixed(4)}</p>
                </div>
              </div>
            ))}
            {gpsCheckins.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No GPS check-ins today</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" />Pending Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Leave Requests', count: leaves.filter(l => l.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Pending Payroll', count: payrolls.filter(p => p.payment_status === 'pending').length, color: 'text-red-600', bg: 'bg-red-500/10' },
              { label: 'Unpaid Purchases', count: purchases.filter(p => p.payment_status === 'unpaid').length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { label: 'Open Tasks (Urgent)', count: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length, color: 'text-red-600', bg: 'bg-red-500/10' },
              { label: 'Low Stock Products', count: products.filter(p => p.status !== 'in_stock').length, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            ].map(item => (
              <div key={item.label} className={cn('flex items-center justify-between rounded-lg px-3 py-2', item.bg)}>
                <span className="text-xs font-medium">{item.label}</span>
                <span className={cn('text-sm font-bold', item.color)}>{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}