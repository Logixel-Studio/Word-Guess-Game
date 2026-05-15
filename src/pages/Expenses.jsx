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
import ExpenseTypeForm from '@/components/expenses/ExpenseTypeForm';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import CreatedByBadge from '@/components/shared/CreatedByBadge';
import CreatorFilter from '@/components/shared/CreatorFilter';
import { Button } from '@/components/ui/button';
import { Receipt, DollarSign, CheckCircle, XCircle, Plus, Tag, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Expenses() {
  const { formatCurrency } = useCurrency();
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState('');
  const qc = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => db.Expense.list() });
  const { data: expenseTypes = [], isLoading: loadingTypes } = useQuery({ queryKey: ['expenseTypes'], queryFn: () => db.ExpenseType.list() });

  const deleteExpense = useMutation({
    mutationFn: (id) => db.Expense.delete(id),
    onSuccess: () => { 
      // qc.invalidateQueries({ queryKey: ['expenses'] });
       toast.success('Deleted'); setDeleteId(null); }
  });
  const deleteTypeMut = useMutation({
    mutationFn: (id) => db.ExpenseType.delete(id),
    onSuccess: () => {
      //  qc.invalidateQueries({ queryKey: ['expenseTypes'] });
        toast.success('Type deleted'); setDeleteType(null); }
  });

  const totalAmount = expenses.reduce((a, e) => a + (e.total || 0), 0);
  const paidCount = expenses.filter(e => e.payment_status === 'paid').length;
  const unpaidCount = expenses.filter(e => e.payment_status === 'unpaid').length;

  const filtered = creatorFilter ? expenses.filter(e => e.creator_name === creatorFilter) : expenses;

  const expenseColumns = [
    { key: 'expense_type_name', label: 'Type', render: v => <span className="font-medium">{v}</span> },
    { key: 'qty', label: 'Qty', render: v => <span className="hidden sm:block">{v}</span> },
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(row); setExpenseFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
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
        <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-emerald-600 font-medium">{formatCurrency(row.paid_amount || 0)}</p></div>
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
      <PageHeader title="Expenses" description="Manage expense types and entries">
        <Button variant="outline" size="sm" onClick={() => { setEditingType(null); setTypeFormOpen(true); }} className="gap-1.5">
          <Tag className="w-4 h-4" /> Create Type
        </Button>
        <Button onClick={() => { setEditing(null); setExpenseFormOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total" value={formatNumber(expenses.length)} icon={Receipt} />
        <SummaryCard title="Amount" value={formatCurrency(totalAmount)} icon={DollarSign} delay={0.05} />
        <SummaryCard title="Paid" value={formatNumber(paidCount)} icon={CheckCircle} delay={0.1} />
        <SummaryCard title="Unpaid" value={formatNumber(unpaidCount)} icon={XCircle} delay={0.15} />
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="types">Expense Types</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <CreatorFilter value={creatorFilter} onChange={setCreatorFilter} />
          </div>
          <DataTable columns={expenseColumns} data={filtered} isLoading={isLoading} searchKey="expense_type_name" expandedContent={expandedContent} />
        </TabsContent>
        <TabsContent value="types">
          <DataTable columns={typeColumns} data={expenseTypes} isLoading={loadingTypes} searchKey="name" expandedContent={typeExpandedContent} />
        </TabsContent>
      </Tabs>

      <ExpenseTypeForm open={typeFormOpen} onClose={() => { setTypeFormOpen(false); setEditingType(null); }} editing={editingType} />
      <ExpenseForm open={expenseFormOpen} onClose={() => { setExpenseFormOpen(false); setEditing(null); }} editing={editing} expenseTypes={expenseTypes} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteExpense.mutate(deleteId)} />
      <ConfirmDialog open={!!deleteType} onClose={() => setDeleteType(null)} onConfirm={() => deleteTypeMut.mutate(deleteType)} />
    </div>
  );
}
