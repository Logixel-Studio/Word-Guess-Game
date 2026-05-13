import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { formatNumber, formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import DueDateBadge from '@/components/shared/DueDateBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import SaleForm from '@/components/sales/SaleForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, CheckCircle, XCircle, AlertCircle, Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function Sales() {
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({ queryKey: ['sales'], queryFn: () => db.Sale.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.Client.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const sale = sales.find(s => s.id === id);
      if (sale) {
        const product = products.find(p => p.id === sale.product_id);
        if (product) {
          const newQty = (product.stock_qty || 0) + (sale.qty || 0);
          let status = newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';
          await db.Product.update(product.id, { stock_qty: newQty, status });
        }
      }
      return db.Sale.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Sale deleted, stock restored');
      setDeleteId(null);
    }
  });

  const totalRevenue = sales.reduce((a, s) => a + (s.total || 0), 0);
  const totalProfit = sales.reduce((a, s) => a + (s.profit || 0), 0);
  const paidSales = sales.filter(s => s.payment_status === 'paid').length;
  const unpaidSales = sales.filter(s => s.payment_status === 'unpaid').length;
  const partialSales = sales.filter(s => s.payment_status === 'partial').length;

  const filtered = creatorFilter ? sales.filter(s => s.creator_name === creatorFilter) : sales;

  const columns = [
    { key: 'client_name', label: 'Client', render: v => <span className="font-medium">{v}</span> },
    { key: 'product_name', label: 'Product', render: v => <span className="hidden sm:block">{v}</span> },
    { key: 'qty', label: 'Qty', render: v => <span className="hidden md:block">{v}</span> },
    { key: 'total', label: 'Total', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'profit', label: 'Profit', render: v => <span className={`font-medium hidden lg:block ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(v)}</span> },
    { key: 'payment_status', label: 'Status', render: (v, row) => (
      <div className="flex flex-col gap-1">
        <StatusBadge status={v} />
        <DueDateBadge dueDate={row.due_date} paymentStatus={v} />
      </div>
    )},
    { key: 'created_date', label: 'Date', render: v => <span className="text-xs text-muted-foreground hidden lg:block">{formatDate(v)}</span> },
    {
      key: 'id', label: '', render: (_, row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const expandedContent = (row) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium">{row.client_name}</p></div>
        <div><p className="text-xs text-muted-foreground">Product</p><p className="font-medium">{row.product_name}</p></div>
        <div><p className="text-xs text-muted-foreground">Qty</p><p className="font-medium">{row.qty}</p></div>
        <div><p className="text-xs text-muted-foreground">Unit Price</p><p>{formatCurrency(row.unit_price)}</p></div>
        <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(row.total)}</p></div>
        <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-emerald-600 font-medium">{formatCurrency(row.payment_status === 'paid' ? row.total : (row.paid_amount || 0))}</p></div>
        <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-red-600 font-medium">{formatCurrency(row.payment_status === 'paid' ? 0 : (row.total || 0) - (row.paid_amount || 0))}</p></div>
        <div><p className="text-xs text-muted-foreground">Profit</p><p className={row.profit >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{formatCurrency(row.profit)}</p></div>
        <div><p className="text-xs text-muted-foreground">Cost/Unit</p><p>{formatCurrency(row.cost_per_unit)}</p></div>
        <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={row.payment_status} /></div>
        {row.due_date && <div><p className="text-xs text-muted-foreground">Due Date</p><p>{formatDate(row.due_date)}</p></div>}
        {row.due_date && row.payment_status !== 'paid' && <div><p className="text-xs text-muted-foreground">Time Left</p><DueDateBadge dueDate={row.due_date} paymentStatus={row.payment_status} /></div>}
        {row.description && <div className="col-span-2 lg:col-span-4"><p className="text-xs text-muted-foreground">Description</p><p>{row.description}</p></div>}
      </div>
      <CreatedByBadge row={row} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Sales" description="Track all your sales">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Sale
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard title="Total Sales" value={formatNumber(sales.length)} icon={TrendingUp} />
        <SummaryCard title="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} delay={0.05} />
        <SummaryCard title="Profit" value={formatCurrency(totalProfit)} icon={BarChart3} delay={0.1} />
        <SummaryCard title="Paid" value={formatNumber(paidSales)} icon={CheckCircle} delay={0.15} />
        <SummaryCard title="Unpaid" value={formatNumber(unpaidSales)} icon={XCircle} delay={0.2} />
        <SummaryCard title="Partial" value={formatNumber(partialSales)} icon={AlertCircle} delay={0.25} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchKey="client_name" expandedContent={expandedContent} />

      <SaleForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} clients={clients} products={products} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} />
    </div>
  );
}
