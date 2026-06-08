import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, CreditCard, CheckCircle, Clock, Target, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SalesDashboard() {
  const { formatCurrency } = useCurrency();
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });

  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalProfit = sales.reduce((s, r) => s + (r.profit || 0), 0);
  const monthRevenue = sales.filter(s => (s.created_date || '').startsWith(thisMonth)).reduce((s, r) => s + (r.total || 0), 0);
  const lastMonthRevenue = sales.filter(s => (s.created_date || '').startsWith(lastMonth)).reduce((s, r) => s + (r.total || 0), 0);
  const revenueGrowth = lastMonthRevenue > 0 ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : 0;
  const paidSales = sales.filter(s => s.payment_status === 'paid').length;
  const unpaidAmount = sales.filter(s => s.payment_status !== 'paid').reduce((a, s) => a + ((s.total || 0) - (s.paid_amount || 0)), 0);
  const monthOrders = sales.filter(s => (s.created_date || '').startsWith(thisMonth)).length;

  // Monthly trend
  const monthlyMap = {};
  sales.forEach(s => {
    const m = (s.created_date || '').slice(0, 7); if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, revenue: 0, profit: 0, count: 0 };
    monthlyMap[m].revenue += s.total || 0;
    monthlyMap[m].profit += s.profit || 0;
    monthlyMap[m].count++;
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);

  // Top clients
  const topClients = clients.map(c => {
    const clientSales = sales.filter(s => s.client_id === c.id);
    return { ...c, totalSales: clientSales.reduce((a, s) => a + (s.total || 0), 0), count: clientSales.length, profit: clientSales.reduce((a, s) => a + (s.profit || 0), 0) };
  }).filter(c => c.totalSales > 0).sort((a, b) => b.totalSales - a.totalSales).slice(0, 8);

  // Top products
  const productSales = products.map(p => {
    const ps = sales.filter(s => s.product_id === p.id);
    return { name: p.name?.slice(0, 15), revenue: ps.reduce((a, s) => a + (s.total || 0), 0), qty: ps.reduce((a, s) => a + (s.qty || 0), 0) };
  }).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // Payment status pie
  const payPie = [
    { name: 'Paid', value: sales.filter(s => s.payment_status === 'paid').length },
    { name: 'Partial', value: sales.filter(s => s.payment_status === 'partial').length },
    { name: 'Unpaid', value: sales.filter(s => s.payment_status === 'unpaid').length },
  ].filter(d => d.value > 0);

  const recentSales = [...sales].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6);

  return (
    <div>
      <PageHeader title="Sales Intelligence Dashboard" description="Revenue analytics, client insights and growth tracking">
        <Badge variant="outline" className="text-cyan-600 border-cyan-300 bg-cyan-50">Sales Manager</Badge>
        {revenueGrowth > 0 && <Badge className="bg-emerald-600 text-white"><TrendingUp className="w-3 h-3 mr-1" />+{revenueGrowth}% MoM</Badge>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} delay={0} />
        <SummaryCard title="Total Profit" value={formatCurrency(totalProfit)} icon={DollarSign} delay={0.04} trendUp={totalProfit >= 0} />
        <SummaryCard title="Month Revenue" value={formatCurrency(monthRevenue)} icon={Target} delay={0.08} />
        <SummaryCard title="Month Orders" value={monthOrders} icon={CheckCircle} delay={0.12} />
        <SummaryCard title="Total Clients" value={clients.length} icon={Users} delay={0.16} />
        <SummaryCard title="Total Orders" value={sales.length} icon={Award} delay={0.20} />
        <SummaryCard title="Paid Orders" value={paidSales} icon={CreditCard} delay={0.24} />
        <SummaryCard title="Receivable" value={formatCurrency(unpaidAmount)} icon={Clock} delay={0.28} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Revenue & Profit Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} width={72} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2)/0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Order Payment Status</h3>
          {payPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {payPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Top Products by Revenue</h3>
          {productSales.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={productSales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><Award className="w-4 h-4 text-amber-500" />Top Clients</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-primary/20 text-primary'
                )}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.count} orders · Profit: {formatCurrency(c.profit)}</p>
                </div>
                <span className="text-sm font-bold text-right flex-shrink-0">{formatCurrency(c.totalSales)}</span>
              </div>
            ))}
            {topClients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sales data</p>}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-3">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {['Client', 'Product', 'Qty', 'Amount', 'Profit', 'Status', 'Date'].map(h => (
                  <th key={h} className="pb-2 font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map(s => (
                <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-2 font-medium">{s.client_name}</td>
                  <td className="py-2 text-muted-foreground">{s.product_name}</td>
                  <td className="py-2">{s.qty}</td>
                  <td className="py-2 font-semibold">{formatCurrency(s.total)}</td>
                  <td className={cn('py-2 font-medium', (s.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(s.profit || 0)}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={cn('text-xs',
                      s.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      s.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                    )}>{s.payment_status}</Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">{formatDate(s.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}