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
import DueDateBadge from '@/components/shared/DueDateBadge';
import SupplierForm from '@/components/suppliers/SupplierForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { Truck, UserCheck, Clock, ShoppingCart, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Suppliers() {
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => db.Supplier.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => db.Purchase.list() });

  const deleteMut = useMutation({
    mutationFn: (id) => db.Supplier.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier deleted'); setDeleteId(null); }
  });

  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const pendingPayments = purchases.filter(p => p.payment_status !== 'paid').reduce((a, p) => a + ((p.total || 0) - (p.paid_amount || 0)), 0);
  const totalPurchases = purchases.reduce((a, p) => a + (p.total || 0), 0);

  const filtered = creatorFilter ? suppliers.filter(s => s.creator_name === creatorFilter) : suppliers;

  const columns = [
    { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address', render: v => <span className="hidden md:block">{v || '—'}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'active'} /> },
    { key: 'created_date', label: 'Created', render: v => <span className="text-sm text-muted-foreground hidden lg:block">{formatDate(v)}</span> },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const expandedContent = (row) => {
    const supplierPurchases = purchases.filter(p => p.supplier_id === row.id);
    return (
      <div className="space-y-3">
        <p className="text-sm"><strong>Description:</strong> {row.description || '—'}</p>
        <div>
          <p className="text-sm font-medium mb-2">Purchase History ({supplierPurchases.length})</p>
          {supplierPurchases.length === 0 ? <p className="text-sm text-muted-foreground">No purchases yet</p> : (
            <div className="space-y-1">
              {supplierPurchases.map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm bg-background rounded-lg p-2">
                  <span className="flex-1 min-w-0 truncate">{p.purchase_type_name}</span>
                  <span className="font-medium">{formatCurrency(p.total)}</span>
                  <StatusBadge status={p.payment_status} />
                  <DueDateBadge dueDate={p.due_date} paymentStatus={p.payment_status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <CreatedByBadge row={row} />
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage your supplier relationships">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Suppliers" value={formatNumber(suppliers.length)} icon={Truck} />
        <SummaryCard title="Active" value={formatNumber(activeSuppliers)} icon={UserCheck} delay={0.05} />
        <SummaryCard title="Pending" value={formatCurrency(pendingPayments)} icon={Clock} delay={0.1} />
        <SummaryCard title="Total Purchases" value={formatCurrency(totalPurchases)} icon={ShoppingCart} delay={0.15} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchKey="name" expandedContent={expandedContent} />

      <SupplierForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} />
    </div>
  );
}
