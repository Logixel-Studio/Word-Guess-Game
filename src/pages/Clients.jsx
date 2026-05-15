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
import ClientForm from '@/components/clients/ClientForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Clock, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Clients() {
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: () => db.Client.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => db.Sale.list() });

  const deleteMut = useMutation({
    mutationFn: (id) => db.Client.delete(id),
    onSuccess: () => {
      //  qc.invalidateQueries({ queryKey: ['clients'] });
     toast.success('Client deleted'); setDeleteId(null); }
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingPayments = sales.filter(s => s.payment_status !== 'paid').reduce((a, s) => a + ((s.total || 0) - (s.paid_amount || 0)), 0);
  const totalRevenue = sales.reduce((a, s) => a + (s.total || 0), 0);

  const filtered = creatorFilter
    ? clients.filter(c => c.creator_name === creatorFilter)
    : clients;

  const columns = [
    { key: 'name', label: 'Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address', render: v => <span className="hidden md:block">{v || '—'}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'active'} /> },
    { key: 'created_date', label: 'Created', render: v => <span className="text-sm text-muted-foreground hidden lg:block">{formatDate(v)}</span> },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
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

  const expandedContent = (row) => {
    const clientSales = sales.filter(s => s.client_id === row.id);
    return (
      <div className="space-y-3">
        <p className="text-sm"><strong>Description:</strong> {row.description || '—'}</p>
        <div>
          <p className="text-sm font-medium mb-2">Sales History ({clientSales.length})</p>
          {clientSales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet</p> : (
            <div className="space-y-1">
              {clientSales.map(s => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm bg-background rounded-lg p-2">
                  <span className="flex-1 min-w-0 truncate">{s.product_name}</span>
                  <span className="font-medium">{formatCurrency(s.total)}</span>
                  <StatusBadge status={s.payment_status} />
                  <DueDateBadge dueDate={s.due_date} paymentStatus={s.payment_status} />
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
      <PageHeader title="Clients" description="Manage your client relationships">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Clients" value={formatNumber(clients.length)} icon={Users} />
        <SummaryCard title="Active" value={formatNumber(activeClients)} icon={UserCheck} delay={0.05} />
        <SummaryCard title="Pending" value={formatCurrency(pendingPayments)} icon={Clock} delay={0.1} />
        <SummaryCard title="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} delay={0.15} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchKey="name" expandedContent={expandedContent} />

      <ClientForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} />
    </div>
  );
}
