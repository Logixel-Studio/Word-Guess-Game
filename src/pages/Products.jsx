import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { formatNumber, formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ProductForm from '@/components/products/ProductForm';
import StockUpdateForm from '@/components/products/StockUpdateForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, CheckCircle, AlertTriangle, XCircle, Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function Products() {
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });

  const deleteMut = useMutation({
    mutationFn: (id) => db.Product.delete(id),
    onSuccess: () => {
      //  qc.invalidateQueries({ queryKey: ['products'] });
     toast.success('Product deleted'); setDeleteId(null); }
  });

  const totalValue = products.reduce((a, p) => a + ((p.production_cost || 0) * (p.stock_qty || 0)), 0);
  const totalStock = products.reduce((a, p) => a + (p.stock_qty || 0), 0);
  const lowStock = products.filter(p => (p.stock_qty || 0) > 0 && (p.stock_qty || 0) <= 10).length;
  const outOfStock = products.filter(p => (p.stock_qty || 0) === 0).length;

  const filtered = creatorFilter ? products.filter(p => p.creator_name === creatorFilter) : products;

  const columns = [
    { key: 'name', label: 'Product', render: v => <span className="font-medium">{v}</span> },
    { key: 'production_cost', label: 'Unit Cost', render: v => <span className="hidden sm:block">{formatCurrency(v)}</span> },
    { key: 'stock_qty', label: 'Stock', render: v => <span className="font-semibold">{formatNumber(v || 0)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'out_of_stock'} /> },
    { key: 'created_date', label: 'Created', render: v => <span className="text-sm text-muted-foreground hidden lg:block">{formatDate(v)}</span> },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStockOpen(row)}>
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row); setFormOpen(true); }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const expandedContent = (row) => (
    <div className="space-y-3">
      <p className="text-sm"><strong>Description:</strong> {row.description || '—'}</p>
      <div>
        <p className="text-sm font-medium mb-2">Materials ({row.materials?.length || 0})</p>
        {(!row.materials || row.materials.length === 0) ? (
          <p className="text-sm text-muted-foreground">No materials defined</p>
        ) : (
          <div className="space-y-1">
            {row.materials.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-background rounded-lg p-2">
                <span>{m.name}</span>
                <span className="text-muted-foreground">{m.qty} × {formatCurrency(m.unit_price)}</span>
                <span className="font-medium">{formatCurrency(m.total)}</span>
              </div>
            ))}
            <div className="flex justify-end pt-1 border-t border-border">
              <span className="text-sm font-bold">Production Cost: {formatCurrency(row.production_cost)}</span>
            </div>
          </div>
        )}
      </div>
      <CreatedByBadge row={row} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Products" description="Create and manage finished products">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Create Product
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard title="Products" value={formatNumber(products.length)} icon={Package} />
        <SummaryCard title="Value" value={formatCurrency(totalValue)} icon={DollarSign} delay={0.05} />
        <SummaryCard title="Stock" value={formatNumber(totalStock)} icon={CheckCircle} delay={0.1} />
        <SummaryCard title="Low Stock" value={formatNumber(lowStock)} icon={AlertTriangle} delay={0.15} />
        <SummaryCard title="Out of Stock" value={formatNumber(outOfStock)} icon={XCircle} delay={0.2} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchKey="name" expandedContent={expandedContent} />

      <ProductForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
      <StockUpdateForm product={stockOpen} onClose={() => setStockOpen(null)} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} />
    </div>
  );
}
