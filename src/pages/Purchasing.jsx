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
import PurchaseTypeForm from '@/components/purchasing/PurchaseTypeForm';
import PurchaseForm from '@/components/purchasing/PurchaseForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign, CheckCircle, XCircle, AlertCircle, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Purchasing() {
  const { formatCurrency } = useCurrency();
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: () => db.Purchase.list() });
  const { data: purchaseTypes = [], isLoading: loadingTypes } = useQuery({ queryKey: ['purchaseTypes'], queryFn: () => db.PurchaseType.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => db.Supplier.list() });

  const deletePurchase = useMutation({
    mutationFn: (id) => db.Purchase.delete(id),
    onSuccess: () => { 
      // qc.invalidateQueries({ queryKey: ['purchases'] });
     toast.success('Deleted'); setDeleteId(null); }
  });
  const deleteTypeMut = useMutation({
    mutationFn: (id) => db.PurchaseType.delete(id),
    onSuccess: () => { 
      // qc.invalidateQueries({ queryKey: ['purchaseTypes'] });
     toast.success('Type deleted'); setDeleteType(null); }
  });

  const totalAmount = purchases.reduce((a, p) => a + (p.total || 0), 0);
  const paidCount = purchases.filter(p => p.payment_status === 'paid').length;
  const unpaidCount = purchases.filter(p => p.payment_status === 'unpaid').length;
  const partialCount = purchases.filter(p => p.payment_status === 'partial').length;

  const filtered = creatorFilter ? purchases.filter(p => p.creator_name === creatorFilter) : purchases;

  const purchaseColumns = [
    { key: 'supplier_name', label: 'Supplier', render: v => <span className="font-medium">{v}</span> },
    { key: 'purchase_type_name', label: 'Type', render: v => <span className="hidden sm:block">{v}</span> },
    { key: 'qty', label: 'Qty', render: v => <span className="hidden md:block">{v}</span> },
    { key: 'total', label: 'Total', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row); setPurchaseFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const typeColumns = [
    { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'description', label: 'Description' },
    { key: 'created_date', label: 'Created', render: v => <span className="text-sm text-muted-foreground">{formatDate(v)}</span> },
    {
      key: 'id', label: '', render: (_, row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingType(row); setTypeFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteType(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const expandedContent = (row) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Description</p><p>{row.description || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Unit Price</p><p>{formatCurrency(row.unit_price)}</p></div>
        <div><p className="text-xs text-muted-foreground">Paid Amount</p><p className="text-emerald-600 font-medium">{formatCurrency(row.paid_amount || 0)}</p></div>
        <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-red-600 font-medium">{formatCurrency((row.total || 0) - (row.paid_amount || 0))}</p></div>
        {row.due_date && <div><p className="text-xs text-muted-foreground">Due Date</p><p>{formatDate(row.due_date)}</p></div>}
        {row.due_date && row.payment_status !== 'paid' && <div><p className="text-xs text-muted-foreground">Time Left</p><DueDateBadge dueDate={row.due_date} paymentStatus={row.payment_status} /></div>}
      </div>
      <CreatedByBadge row={row} />
    </div>
  );

  const typeExpandedContent = (row) => (
    <div className="space-y-3">
      <div className="text-sm"><p className="text-xs text-muted-foreground">Description</p><p>{row.description || '—'}</p></div>
      <CreatedByBadge row={row} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Purchasing" description="Manage purchase types and entries">
        <Button variant="outline" size="sm" onClick={() => { setEditingType(null); setTypeFormOpen(true); }} className="gap-1.5">
          <Tag className="w-4 h-4" /> Create Type
        </Button>
        <Button onClick={() => { setEditing(null); setPurchaseFormOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Purchase
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard title="Total" value={formatNumber(purchases.length)} icon={ShoppingCart} />
        <SummaryCard title="Amount" value={formatCurrency(totalAmount)} icon={DollarSign} delay={0.05} />
        <SummaryCard title="Paid" value={formatNumber(paidCount)} icon={CheckCircle} delay={0.1} />
        <SummaryCard title="Unpaid" value={formatNumber(unpaidCount)} icon={XCircle} delay={0.15} />
        <SummaryCard title="Partial" value={formatNumber(partialCount)} icon={AlertCircle} delay={0.2} />
      </div>

      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="types">Purchase Types</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
          </div>
          <DataTable columns={purchaseColumns} data={filtered} isLoading={isLoading} searchKey="supplier_name" expandedContent={expandedContent} />
        </TabsContent>
        <TabsContent value="types">
          <DataTable columns={typeColumns} data={purchaseTypes} isLoading={loadingTypes} searchKey="name" expandedContent={typeExpandedContent} />
        </TabsContent>
      </Tabs>

      <PurchaseTypeForm open={typeFormOpen} onClose={() => { setTypeFormOpen(false); setEditingType(null); }} editing={editingType} />
      <PurchaseForm open={purchaseFormOpen} onClose={() => { setPurchaseFormOpen(false); setEditing(null); }} editing={editing} suppliers={suppliers} purchaseTypes={purchaseTypes} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deletePurchase.mutate(deleteId)} />
      <ConfirmDialog open={!!deleteType} onClose={() => setDeleteType(null)} onConfirm={() => deleteTypeMut.mutate(deleteType)} />
    </div>
  );
}
