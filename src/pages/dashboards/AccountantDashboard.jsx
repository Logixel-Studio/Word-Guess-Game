import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Clock, AlertTriangle, Receipt, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-5))'];

export default function AccountantDashboard() {
  const { formatCurrency } = useCurrency();
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: payrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 200) });

  const thisMonth = new Date().toISOString().slice(0, 7);

  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + (r.total || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (r.total || 0), 0);
  const totalCosts = totalPurchases + totalExpenses;
  const netProfit = totalRevenue - totalCosts;

  const pendingReceivable = sales.filter(s => s.payment_status !== 'paid').reduce((a, s) => a + ((s.total || 0) - (s.paid_amount || 0)), 0);
  const pendingPayable = purchases.filter(p => p.payment_status !== 'paid').reduce((a, p) => a + ((p.total || 0) - (p.paid_amount || 0)), 0);
  const payrollPending = payrolls.filter(p => p.payment_status === 'pending').reduce((s, p) => s + (p.net_salary || 0), 0);
  const monthRevenue = sales.filter(s => (s.created_date || '').startsWith(thisMonth)).reduce((s, r) => s + (r.total || 0), 0);
  const monthProfit = sales.filter(s => (s.created_date || '').startsWith(thisMonth)).reduce((s, r) => s + (r.profit || 0), 0);

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
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const payStatusPie = [
    { name: 'Paid Sales', value: sales.filter(s => s.payment_status === 'paid').reduce((a, s) => a + (s.total || 0), 0) },
    { name: 'Receivable', value: pendingReceivable },
    { name: 'Payable', value: pendingPayable },
    { name: 'Payroll Due', value: payrollPending },
  ].filter(d => d.value > 0);

  // Recent transactions
  const recentSales = [...sales].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6);
  const overduePayments = [
    ...sales.filter(s => s.payment_status !== 'paid' && s.due_date && new Date(s.due_date) < new Date()).map(s => ({ ...s, type: 'Sale' })),
    ...purchases.filter(p => p.payment_status !== 'paid' && p.due_date && new Date(p.due_date) < new Date()).map(p => ({ ...p, type: 'Purchase' })),
  ].slice(0, 6);

  return (
    <div>
      <PageHeader title="Financial Dashboard" description="Complete financial oversight and accounting">
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">Accountant</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} delay={0} />
        <SummaryCard title="Total Costs" value={formatCurrency(totalCosts)} icon={TrendingDown} delay={0.04} />
        <SummaryCard title="Net Profit" value={formatCurrency(netProfit)} icon={DollarSign} delay={0.08} trendUp={netProfit >= 0} />
        <SummaryCard title="Month Revenue" value={formatCurrency(monthRevenue)} icon={CheckCircle} delay={0.12} />
        <SummaryCard title="Month Profit" value={formatCurrency(monthProfit)} icon={TrendingUp} delay={0.16} trendUp={monthProfit >= 0} />
        <SummaryCard title="Receivable" value={formatCurrency(pendingReceivable)} icon={CreditCard} delay={0.20} />
        <SummaryCard title="Payable" value={formatCurrency(pendingPayable)} icon={Clock} delay={0.24} />
        <SummaryCard title="Payroll Due" value={formatCurrency(payrollPending)} icon={AlertTriangle} delay={0.28} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Revenue vs Costs — Monthly</h3>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Cash Flow Breakdown</h3>
          {payStatusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payStatusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" label={({ name }) => name} labelLine={false} fontSize={9}>
                  {payStatusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Profit Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} width={72} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" />Overdue Payments</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {overduePayments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.client_name || p.supplier_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{p.type} · Due: {formatDate(p.due_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-600">{formatCurrency((p.total || 0) - (p.paid_amount || 0))}</p>
                </div>
              </div>
            ))}
            {overduePayments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No overdue payments</p>}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-3">Recent Sales Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground text-xs">Client</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Product</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Amount</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Profit</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Status</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(s => (
                <tr key={s.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 font-medium">{s.client_name}</td>
                  <td className="py-2 text-muted-foreground">{s.product_name}</td>
                  <td className="py-2 font-semibold">{formatCurrency(s.total)}</td>
                  <td className={cn('py-2 font-medium', (s.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(s.profit || 0)}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={cn('text-xs',
                      s.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      s.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
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