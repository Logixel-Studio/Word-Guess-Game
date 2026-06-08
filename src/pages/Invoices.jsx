import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDate, formatNumber } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import { usePermissions } from '@/lib/PermissionsContext';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceExpandedRow from '@/components/invoices/InvoiceExpandedRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Invoices() {
  const { formatCurrency } = useCurrency();
  const { canCreate, canUpdate, canDelete, canExport, can } = usePermissions();
  const canPrint = can('invoices', 'print');
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterParty, setFilterParty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 500),
  });
  const { data: settings = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = settings[0] || {};

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); setDeleteId(null); },
  });

  // Filtered invoices
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (filterType !== 'all' && inv.invoice_type !== filterType) return false;
      if (filterStatus !== 'all' && inv.payment_status !== filterStatus) return false;
      if (filterParty && !inv.party_name?.toLowerCase().includes(filterParty.toLowerCase())) return false;
      if (searchTerm && !inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.party_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (dateFrom && inv.invoice_date < dateFrom) return false;
      if (dateTo && inv.invoice_date > dateTo) return false;
      return true;
    });
  }, [invoices, filterType, filterStatus, filterParty, searchTerm, dateFrom, dateTo]);

  // Summary stats
  const totalAmount = filtered.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalPaid = filtered.filter(i => i.payment_status === 'paid').length;
  const totalUnpaid = filtered.filter(i => i.payment_status === 'unpaid').length;
  const totalOverdue = filtered.filter(i => {
    if (!i.due_date || i.payment_status === 'paid') return false;
    return new Date(i.due_date) < new Date();
  }).length;

  const columns = [
    {
      key: 'invoice_number', label: 'Invoice #',
      render: v => <span className="font-mono text-xs font-semibold text-primary">{v}</span>
    },
    {
      key: 'invoice_type', label: 'Type',
      render: v => (
        <Badge variant="outline" className={v === 'client' ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs' : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'}>
          {v === 'client' ? 'Client' : 'Supplier'}
        </Badge>
      )
    },
    { key: 'party_name', label: 'Party', render: v => <span className="font-medium">{v}</span> },
    { key: 'invoice_date', label: 'Date', render: v => <span className="text-xs text-muted-foreground">{formatDate(v)}</span> },
    {
      key: 'due_date', label: 'Due',
      render: (v, row) => {
        if (!v) return <span className="text-muted-foreground">—</span>;
        const days = Math.ceil((new Date(v) - new Date()) / 86400000);
        const isOverdue = days < 0 && row.payment_status !== 'paid';
        return (
          <span className={cn('text-xs', isOverdue ? 'text-red-600 font-medium' : days <= 3 ? 'text-amber-600' : 'text-muted-foreground')}>
            {formatDate(v)}{isOverdue ? ` (${Math.abs(days)}d over)` : ''}
          </span>
        );
      }
    },
    { key: 'grand_total', label: 'Amount', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'payment_status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'created_by_name', label: 'Created By', render: v => <span className="text-xs text-muted-foreground hidden lg:block">{v}</span> },
  ];

  const expandedContent = (row) => (
    <InvoiceExpandedRow
      row={row}
      onEdit={(r) => { setEditing(r); setFormOpen(true); }}
      onDelete={setDeleteId}
      canUpdate={canUpdate('invoices')}
      canDelete={canDelete('invoices')}
      canExport={canExport('invoices')}
      canPrint={canPrint}
      companySettings={companySettings}
    />
  );

  return (
    <div>
      <PageHeader title="Invoices" description="Manage client and supplier invoices">
        {canCreate('invoices') && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Create Invoice
          </Button>
        )}
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Total Invoices" value={formatNumber(filtered.length)} icon={FileText} delay={0} />
        <SummaryCard title="Total Amount" value={formatCurrency(totalAmount)} icon={DollarSign} delay={0.05} />
        <SummaryCard title="Paid" value={formatNumber(totalPaid)} icon={CheckCircle} delay={0.1} />
        <SummaryCard title="Overdue" value={formatNumber(totalOverdue)} icon={AlertCircle} delay={0.15} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input placeholder="Search invoice # or party..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-8 text-xs" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Invoice Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Filter by party name..." value={filterParty} onChange={e => setFilterParty(e.target.value)} className="h-8 text-xs" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" placeholder="From date" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" placeholder="To date" />
        </div>
        {(filterType !== 'all' || filterStatus !== 'all' || filterParty || searchTerm || dateFrom || dateTo) && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{filtered.length} of {invoices.length} invoices</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setFilterType('all'); setFilterStatus('all'); setFilterParty(''); setSearchTerm(''); setDateFrom(''); setDateTo(''); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} expandedContent={expandedContent} pageSize={15} />

      <InvoiceForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} onSaved={() => qc.invalidateQueries({ queryKey: ['invoices'] })} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Invoice?" description="This will permanently delete the invoice." />
    </div>
  );
}