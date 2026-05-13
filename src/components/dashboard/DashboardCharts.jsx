import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/lib/CurrencyContext';

const COLORS = ['hsl(160,84%,39%)', 'hsl(199,89%,48%)', 'hsl(43,96%,56%)', 'hsl(280,67%,60%)', 'hsl(0,84%,60%)'];

function getMonthlyData(records) {
  const monthly = {};
  records.forEach(r => {
    if (!r.created_date) return;
    const d = new Date(r.created_date);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    if (!monthly[key]) monthly[key] = { month: key, total: 0, count: 0, sortKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
    monthly[key].total += r.total || 0;
    monthly[key].count += 1;
  });
  return Object.values(monthly).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export default function DashboardCharts({ sales, purchases, expenses, products }) {
  const { symbol } = useCurrency();
  const [year, setYear] = useState('all');

  const years = useMemo(() => {
    const all = [...sales, ...purchases, ...expenses].map(r => r.created_date).filter(Boolean);
    return [...new Set(all.map(d => new Date(d).getFullYear()))].sort();
  }, [sales, purchases, expenses]);

  const filterByYear = (records) => year === 'all' ? records : records.filter(r => r.created_date && new Date(r.created_date).getFullYear() === Number(year));

  const salesData = getMonthlyData(filterByYear(sales));
  const purchaseData = getMonthlyData(filterByYear(purchases));
  const expenseData = getMonthlyData(filterByYear(expenses));

  const combinedData = useMemo(() => {
    const months = new Set([...salesData, ...purchaseData, ...expenseData].map(d => d.month));
    return [...months].sort().map(m => ({
      month: m,
      Sales: salesData.find(d => d.month === m)?.total || 0,
      Purchases: purchaseData.find(d => d.month === m)?.total || 0,
      Expenses: expenseData.find(d => d.month === m)?.total || 0,
      Profit: (salesData.find(d => d.month === m)?.total || 0) - (purchaseData.find(d => d.month === m)?.total || 0) - (expenseData.find(d => d.month === m)?.total || 0),
    }));
  }, [salesData, purchaseData, expenseData]);

  const paymentPieData = [
    { name: 'Paid', value: filterByYear(sales).filter(s => s.payment_status === 'paid').length },
    { name: 'Unpaid', value: filterByYear(sales).filter(s => s.payment_status === 'unpaid').length },
    { name: 'Partial', value: filterByYear(sales).filter(s => s.payment_status === 'partial').length },
  ].filter(d => d.value > 0);

  const stockData = products.map(p => ({ name: p.name?.substring(0, 10) || 'N/A', stock: p.stock_qty || 0 })).slice(0, 8);

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };
  const fmt = (v) => `${symbol}${Number(v).toFixed(0)}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue & Expenses</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={combinedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmt} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Sales" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Purchases" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expenses" fill={COLORS[4]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Profit Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={combinedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmt} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
                  <Line type="monotone" dataKey="Profit" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales Payment Status</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Product Inventory</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stockData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="stock" fill={COLORS[1]} radius={[0, 3, 3, 0]} name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}