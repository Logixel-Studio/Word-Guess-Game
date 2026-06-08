import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import { Package, Warehouse, AlertTriangle, TrendingDown, ShoppingCart, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-3))', 'hsl(var(--chart-5))'];
const statusStyle = {
  in_stock: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  low_stock: 'bg-amber-500/10 text-amber-700 border-amber-200',
  out_of_stock: 'bg-red-500/10 text-red-700 border-red-200'
};

export default function InventoryDashboard() {
  const { formatCurrency } = useCurrency();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });

  const totalStock = products.reduce((s, p) => s + (p.stock_qty || 0), 0);
  const inStock = products.filter(p => p.status === 'in_stock').length;
  const lowStock = products.filter(p => p.status === 'low_stock').length;
  const outOfStock = products.filter(p => p.status === 'out_of_stock').length;
  const totalInventoryValue = products.reduce((s, p) => s + ((p.production_cost || 0) * (p.stock_qty || 0)), 0);
  const recentPurchases = [...purchases].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthPurchases = purchases.filter(p => (p.created_date || '').startsWith(thisMonth)).reduce((s, p) => s + (p.total || 0), 0);

  // Stock chart
  const stockData = [...products]
    .filter(p => (p.stock_qty || 0) > 0)
    .sort((a, b) => (b.stock_qty || 0) - (a.stock_qty || 0))
    .slice(0, 8)
    .map(p => ({ name: p.name?.slice(0, 12) + (p.name?.length > 12 ? '…' : ''), stock: p.stock_qty, value: (p.production_cost || 0) * (p.stock_qty || 0) }));

  // Status pie
  const statusPie = [
    { name: 'In Stock', value: inStock },
    { name: 'Low Stock', value: lowStock },
    { name: 'Out of Stock', value: outOfStock },
  ].filter(d => d.value > 0);

  // Products needing restock
  const restockProducts = products.filter(p => p.status !== 'in_stock').sort((a, b) => (a.stock_qty || 0) - (b.stock_qty || 0));

  // Monthly purchase trend
  const purchaseMonthly = purchases.reduce((acc, p) => {
    const m = (p.created_date || '').slice(0, 7); if (!m) return acc;
    if (!acc[m]) acc[m] = { month: m, total: 0, count: 0 };
    acc[m].total += p.total || 0; acc[m].count++;
    return acc;
  }, {});
  const purchaseTrend = Object.values(purchaseMonthly).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  return (
    <div>
      <PageHeader title="Inventory Control Center" description="Stock management, procurement and warehouse analytics">
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Inventory Manager</Badge>
        {outOfStock > 0 && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{outOfStock} Out of Stock</Badge>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <SummaryCard title="Total Products" value={products.length} icon={Package} delay={0} />
        <SummaryCard title="Total Stock Units" value={totalStock.toLocaleString()} icon={Warehouse} delay={0.04} />
        <SummaryCard title="Inventory Value" value={formatCurrency(totalInventoryValue)} icon={DollarSign} delay={0.08} />
        <SummaryCard title="In Stock" value={inStock} icon={CheckCircle} delay={0.12} />
        <SummaryCard title="Low Stock" value={lowStock} icon={AlertTriangle} delay={0.16} />
        <SummaryCard title="Out of Stock" value={outOfStock} icon={XCircle} delay={0.20} />
        <SummaryCard title="Month Purchases" value={formatCurrency(monthPurchases)} icon={ShoppingCart} delay={0.24} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Stock Levels by Product</h3>
          {stockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stockData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="stock" name="Stock Qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No stock data</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Stock Status Distribution</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
          <h3 className="font-semibold text-sm mb-3">Monthly Purchase Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={purchaseTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} width={72} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="total" name="Purchases" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" />Restock Required</h3>
            <Badge variant="outline" className={cn(restockProducts.length > 0 ? 'bg-red-50 text-red-700 border-red-200' : '')}>{restockProducts.length} items</Badge>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {restockProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Cost: {formatCurrency(p.production_cost || 0)} · Stock: {p.stock_qty || 0} units</p>
                </div>
                <Badge variant="outline" className={cn('text-xs', statusStyle[p.status])}>{p.status?.replace('_', ' ')}</Badge>
              </div>
            ))}
            {restockProducts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All products well stocked</p>}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-sm mb-3">Recent Purchase Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Supplier', 'Type', 'Qty', 'Unit Price', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} className="pb-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map(p => (
                <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="py-2 font-medium">{p.supplier_name}</td>
                  <td className="py-2 text-muted-foreground">{p.purchase_type_name}</td>
                  <td className="py-2">{p.qty}</td>
                  <td className="py-2">{formatCurrency(p.unit_price)}</td>
                  <td className="py-2 font-semibold">{formatCurrency(p.total)}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={cn('text-xs',
                      p.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      p.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                    )}>{p.payment_status}</Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">{formatDate(p.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}