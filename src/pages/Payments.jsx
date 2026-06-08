import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import { getDueDateInfo } from '@/lib/dueDateUtils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DueDateBadge from '@/components/shared/DueDateBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Pencil, Search, SortAsc, SortDesc, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const sectionColors = {
  Sale: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  Purchase: 'bg-blue-500/10 text-blue-700 border-blue-200',
  Expense: 'bg-amber-500/10 text-amber-700 border-amber-200',
};

export default function Payments() {
  const { formatCurrency } = useCurrency();
  const { canUpdate } = usePermissions();
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [editPayment, setEditPayment] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const qc = useQueryClient();

  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });

  const allPayments = useMemo(() => [
    ...sales.map(s => ({ ...s, section: 'Sale', person: s.client_name, entity: 'Sale', subName: s.product_name })),
    ...purchases.map(p => ({ ...p, section: 'Purchase', person: p.supplier_name, entity: 'Purchase', subName: p.purchase_type_name })),
    ...expenses.map(e => ({ ...e, section: 'Expense', person: e.expense_type_name, entity: 'Expense', subName: '' })),
  ], [sales, purchases, expenses]);

  const filtered = useMemo(() => {
    let result = allPayments;
    if (sectionFilter !== 'all') result = result.filter(p => p.entity === sectionFilter);
    if (statusFilter === 'overdue') {
      result = result.filter(p => p.due_date && p.payment_status !== 'paid' && getDueDateInfo(p.due_date)?.badge === 'overdue');
    } else if (statusFilter !== 'all') {
      result = result.filter(p => p.payment_status === statusFilter);
    }
    if (search) result = result.filter(p => p.person?.toLowerCase().includes(search.toLowerCase()) || p.subName?.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'newest') result = [...result].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sort === 'oldest') result = [...result].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    else if (sort === 'highest') result = [...result].sort((a, b) => (b.total || 0) - (a.total || 0));
    else if (sort === 'lowest') result = [...result].sort((a, b) => (a.total || 0) - (b.total || 0));
    return result;
  }, [allPayments, sectionFilter, statusFilter, search, sort]);

  const totalPending = filtered.filter(p => p.payment_status !== 'paid').reduce((a, p) => a + ((p.total || 0) - (p.paid_amount || 0)), 0);
  const overdueCount = allPayments.filter(p => p.due_date && p.payment_status !== 'paid' && getDueDateInfo(p.due_date)?.badge === 'overdue').length;

  return (
    <div>
      <PageHeader title="Payment Status" description="Centralized payment tracking">
        <div className="flex flex-wrap gap-2 items-center">
          {overdueCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
              <AlertTriangle className="w-3 h-3" /> {overdueCount} Overdue
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            Pending: {formatCurrency(totalPending)}
          </Badge>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Sale">Sales</SelectItem>
                <SelectItem value="Purchase">Purchases</SelectItem>
                <SelectItem value="Expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Amount</SelectItem>
                <SelectItem value="lowest">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No records found</p>
          </div>
        )}
        {filtered.map(row => {
          const remaining = row.payment_status === 'paid' ? 0 : (row.total || 0) - (row.paid_amount || 0);
          const isExpanded = expandedId === row.id;
          const dueDateInfo = row.due_date ? getDueDateInfo(row.due_date) : null;
          const paidAmt = row.payment_status === 'paid' ? row.total : (row.paid_amount || 0);

          return (
            <motion.div key={`${row.entity}-${row.id}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
              >
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={cn('text-xs shrink-0', sectionColors[row.section])}>{row.section}</Badge>
                    <span className="font-medium text-sm truncate">{row.person}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.payment_status} />
                    {dueDateInfo && row.payment_status !== 'paid' && (
                      <DueDateBadge dueDate={row.due_date} paymentStatus={row.payment_status} />
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Total: </span>
                    <span className="font-semibold">{formatCurrency(row.total)}</span>
                  </div>
                  <div className="text-sm">
                    {remaining > 0 ? (
                      <span className="text-red-600 font-medium">{formatCurrency(remaining)} due</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Fully paid</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canUpdate('payments') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setEditPayment(row); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/20">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-xs text-muted-foreground mb-1">Section</p><p className="font-medium">{row.section}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">{row.section === 'Sale' ? 'Client' : row.section === 'Purchase' ? 'Supplier' : 'Type'}</p><p className="font-medium">{row.person}</p></div>
                        {row.subName && <div><p className="text-xs text-muted-foreground mb-1">{row.section === 'Sale' ? 'Product' : 'Purchase Type'}</p><p className="font-medium">{row.subName}</p></div>}
                        {row.qty && <div><p className="text-xs text-muted-foreground mb-1">Quantity</p><p className="font-medium">{row.qty}</p></div>}
                        {row.unit_price && <div><p className="text-xs text-muted-foreground mb-1">Unit Price</p><p className="font-medium">{formatCurrency(row.unit_price)}</p></div>}
                        <div><p className="text-xs text-muted-foreground mb-1">Total Amount</p><p className="font-semibold text-foreground">{formatCurrency(row.total)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Paid Amount</p><p className="font-semibold text-emerald-600">{formatCurrency(paidAmt)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Remaining</p><p className={cn('font-semibold', remaining > 0 ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(remaining)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Payment Status</p><StatusBadge status={row.payment_status} /></div>
                        {row.due_date && <div><p className="text-xs text-muted-foreground mb-1">Due Date</p><p className="font-medium">{formatDate(row.due_date)}</p></div>}
                        {row.due_date && row.payment_status !== 'paid' && dueDateInfo && (
                          <div><p className="text-xs text-muted-foreground mb-1">Time Left</p><DueDateBadge dueDate={row.due_date} paymentStatus={row.payment_status} /></div>
                        )}
                        <div><p className="text-xs text-muted-foreground mb-1">Created</p><p className="font-medium">{formatDate(row.created_date)}</p></div>
                        {row.description && <div className="col-span-2 sm:col-span-3 lg:col-span-4"><p className="text-xs text-muted-foreground mb-1">Description</p><p>{row.description}</p></div>}
                        {row.profit != null && <div><p className="text-xs text-muted-foreground mb-1">Profit</p><p className={cn('font-semibold', row.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(row.profit)}</p></div>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <PaymentEditDialog payment={editPayment} onClose={() => setEditPayment(null)} qc={qc} formatCurrency={formatCurrency} />
    </div>
  );
}

function PaymentEditDialog({ payment, onClose, qc, formatCurrency }) {
  const [status, setStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (payment) {
      setStatus(payment.payment_status || 'unpaid');
      setPaidAmount(payment.paid_amount || 0);
      setDueDate(payment.due_date || '');
    }
  }, [payment]);

  const mutation = useMutation({
    mutationFn: () => {
      const entityMap = { Sale: base44.entities.Sale, Purchase: base44.entities.Purchase, Expense: base44.entities.Expense };
      const entity = entityMap[payment.entity];
      const finalPaid = status === 'paid' ? payment.total : Number(paidAmount);
      if (finalPaid > payment.total) { toast.error('Paid amount cannot exceed total'); throw new Error('Invalid amount'); }
      const autoStatus = finalPaid >= payment.total ? 'paid' : finalPaid > 0 ? 'partial' : 'unpaid';
      return entity.update(payment.id, {
        payment_status: autoStatus,
        paid_amount: finalPaid,
        due_date: dueDate || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Payment updated');
      onClose();
    }
  });

  if (!payment) return null;
  const remaining = (payment.total || 0) - Number(paidAmount);

  return (
    <Dialog open={!!payment} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update Payment — {payment.person}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Amount:</span><span className="font-semibold">{formatCurrency(payment.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currently Paid:</span><span className="text-emerald-600">{formatCurrency(payment.paid_amount || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Remaining:</span><span className="text-red-600">{formatCurrency(remaining < 0 ? 0 : remaining)}</span></div>
          </div>
          <div>
            <Label>Payment Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid (Full)</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(status === 'partial' || status === 'unpaid') && (
            <div>
              <Label>Enter Paid / Received Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={payment.total}
                value={paidAmount}
                onChange={e => {
                  const val = Math.min(Number(e.target.value), payment.total);
                  setPaidAmount(val < 0 ? 0 : val);
                }}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Remaining: {formatCurrency(Math.max(0, (payment.total || 0) - Number(paidAmount)))}
              </p>
            </div>
          )}
          {status !== 'paid' && (
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Update'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}