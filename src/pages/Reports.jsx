import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Clock, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function Section({ title, delay = 0, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function Reports() {
  const { formatCurrency } = useCurrency();

  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  const { data: payrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 200) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance-all'], queryFn: () => base44.entities.Attendance.list('-date', 500) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });

  // Monthly financial data
  const monthlyMap = {};
  sales.forEach(s => {
    const m = (s.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0, orders: 0 };
    monthlyMap[m].revenue += s.total || 0;
    monthlyMap[m].profit += s.profit || 0;
    monthlyMap[m].orders++;
  });
  purchases.forEach(p => {
    const m = (p.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0, orders: 0 };
    monthlyMap[m].costs += p.total || 0;
  });
  expenses.forEach(e => {
    const m = (e.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, costs: 0, profit: 0, orders: 0 };
    monthlyMap[m].costs += e.total || 0;
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  // Payroll monthly
  const payrollMap = payrolls.reduce((acc, p) => {
    if (!acc[p.month]) acc[p.month] = { month: p.month, total: 0, paid: 0, count: 0 };
    acc[p.month].total += p.net_salary || 0;
    if (p.payment_status === 'paid') acc[p.month].paid += p.net_salary || 0;
    acc[p.month].count++;
    return acc;
  }, {});
  const payrollData = Object.values(payrollMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  // Attendance monthly
  const attMap = attendance.reduce((acc, a) => {
    const m = (a.date || '').slice(0, 7); if (!m) return acc;
    if (!acc[m]) acc[m] = { month: m, present: 0, absent: 0, late: 0, ot: 0 };
    if (a.status === 'present') acc[m].present++;
    if (a.status === 'absent') acc[m].absent++;
    if (a.status === 'late') acc[m].late++;
    acc[m].ot += a.overtime_hours || 0;
    return acc;
  }, {});
  const attData = Object.values(attMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  // Client sales breakdown
  const clientMap = sales.reduce((acc, s) => {
    const n = s.client_name || 'Unknown'; acc[n] = (acc[n] || 0) + (s.total || 0); return acc;
  }, {});
  const topClients = Object.entries(clientMap).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Dept headcount
  const deptMap = employees.reduce((acc, e) => { const d = e.department || 'Other'; acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // Summary KPIs
  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalCosts = purchases.reduce((s, r) => s + (r.total || 0), 0) + expenses.reduce((s, r) => s + (r.total || 0), 0);
  const totalProfit = totalRevenue - totalCosts;
  const totalPayroll = payrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const avgSalary = employees.length > 0 ? employees.reduce((s, e) => s + (e.basic_salary || 0), 0) / employees.length : 0;
  const attRate = attendance.length > 0 ? Math.round(attendance.filter(a => a.status === 'present').length / attendance.length * 100) : 0;

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Comprehensive business intelligence and analytics">
        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
          <BarChart3 className="w-3 h-3 mr-1" /> Analytics
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} delay={0} />
        <SummaryCard title="Total Costs" value={formatCurrency(totalCosts)} icon={DollarSign} delay={0.04} />
        <SummaryCard title="Net Profit" value={formatCurrency(totalProfit)} icon={BarChart3} delay={0.08} trendUp={totalProfit >= 0} />
        <SummaryCard title="Total Payroll" value={formatCurrency(totalPayroll)} icon={Users} delay={0.12} />
        <SummaryCard title="Avg Salary" value={formatCurrency(avgSalary)} icon={DollarSign} delay={0.16} />
        <SummaryCard title="Attendance Rate" value={attRate + '%'} icon={Clock} delay={0.20} />
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Revenue vs Costs — Monthly" delay={0.1}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => 'Rs ' + (v / 1000).toFixed(0) + 'k'} width={65} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS[0]} fill={COLORS[0] + '20'} strokeWidth={2} />
                  <Area type="monotone" dataKey="costs" name="Costs" stroke={COLORS[4]} fill={COLORS[4] + '20'} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Profit Trend — Monthly" delay={0.15}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => 'Rs ' + (v / 1000).toFixed(0) + 'k'} width={65} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Section>
          </div>
          <Section title="Monthly Order Volume" delay={0.2}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Total Payroll Per Month" delay={0.1}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={payrollData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => 'Rs ' + (v / 1000).toFixed(0) + 'k'} width={65} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="total" name="Total Payroll" fill={COLORS[3]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="paid" name="Paid" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Employees by Department" delay={0.15}>
              {deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                      {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
            </Section>
          </div>
          <Section title="Payroll Summary Table" delay={0.2}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left">{['Month', 'Employees', 'Total Payroll', 'Paid'].map(h => <th key={h} className="pb-2 font-medium text-muted-foreground text-xs">{h}</th>)}</tr></thead>
                <tbody>
                  {payrollData.map(p => (
                    <tr key={p.month} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <td className="py-2 font-medium">{p.month}</td>
                      <td className="py-2">{p.count}</td>
                      <td className="py-2 font-bold">{formatCurrency(p.total)}</td>
                      <td className="py-2 text-emerald-600">{formatCurrency(p.paid)}</td>
                    </tr>
                  ))}
                  {payrollData.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No payroll data</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Attendance Trends — Monthly" delay={0.1}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill={COLORS[2]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill={COLORS[4]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Overtime Hours Trend" delay={0.15}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={attData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ot" name="OT Hours" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Top Clients by Revenue" delay={0.1}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => 'Rs ' + (v / 1000).toFixed(0) + 'k'} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="value" name="Revenue" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Monthly Sales Summary" delay={0.15}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">{['Month', 'Orders', 'Revenue', 'Profit'].map(h => <th key={h} className="pb-2 font-medium text-muted-foreground text-xs text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    {monthlyData.map(m => (
                      <tr key={m.month} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        <td className="py-2 font-medium">{m.month}</td>
                        <td className="py-2">{m.orders}</td>
                        <td className="py-2">{formatCurrency(m.revenue)}</td>
                        <td className={cn('py-2 font-bold', m.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(m.profit)}</td>
                      </tr>
                    ))}
                    {monthlyData.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard title="Total Products" value={products.length} icon={Package} delay={0} />
            <SummaryCard title="In Stock" value={products.filter(p => p.status === 'in_stock').length} icon={Package} delay={0.05} />
            <SummaryCard title="Low Stock" value={products.filter(p => p.status === 'low_stock').length} icon={Package} delay={0.1} />
            <SummaryCard title="Out of Stock" value={products.filter(p => p.status === 'out_of_stock').length} icon={Package} delay={0.15} />
          </div>
          <Section title="Product Stock Levels" delay={0.2}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={products.slice(0, 15).map(p => ({ name: p.name, stock: p.stock_qty || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="stock" name="Stock Qty" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}