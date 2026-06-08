import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import PayrollForm from '@/components/payroll/PayrollForm';
import PayrollExpandedRow from '@/components/payroll/PayrollExpandedRow';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, DollarSign, CheckCircle, Clock, Pencil, Trash2, TrendingDown } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { useCurrency } from '@/lib/CurrencyContext';
import { toast } from 'sonner';

const today = new Date().toISOString().slice(0, 7);

export default function PayrollPage() {
  const { formatCurrency } = useCurrency();
  const { canCreate, canUpdate, canDelete, canApprove } = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [monthFilter, setMonthFilter] = useState(today);

  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ['payrolls'],
    queryFn: () => base44.entities.Payroll.list('-month', 500),
  });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });

  const filtered = useMemo(() => payrolls.filter(p => p.month === monthFilter), [payrolls, monthFilter]);

  const totalNet = filtered.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalPaid = filtered.filter(p => p.payment_status === 'paid').reduce((s, p) => s + (p.net_salary || 0), 0);
  const pendingCount = filtered.filter(p => p.payment_status === 'pending').length;
  const totalDeductions = filtered.reduce((s, p) => s + (p.deductions || 0) + (p.late_deduction || 0) + (p.leave_deduction || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payroll.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payrolls'] }); toast.success('Deleted'); setDeleting(null); },
  });

  const markPaid = useMutation({
    mutationFn: (row) => base44.entities.Payroll.update(row.id, { payment_status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payrolls'] }); toast.success('Marked as paid'); },
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const columns = [
    {
      key: 'employee_name', label: 'Employee',
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm">{v || '—'}</p>
          {row.employee_department && <p className="text-xs text-muted-foreground">{row.employee_department}</p>}
        </div>
      )
    },
    { key: 'basic_salary', label: 'Basic', render: v => formatCurrency(v || 0) },
    {
      key: 'overtime_amount', label: 'Overtime',
      render: (v, row) => {
        const amt = v || row.overtime_pay || 0;
        return amt > 0 ? <span className="text-blue-600">{formatCurrency(amt)}</span> : '—';
      }
    },
    {
      key: 'bonus_amount', label: 'Bonus',
      render: (v, row) => {
        const amt = v || row.bonus || 0;
        return amt > 0 ? <span className="text-emerald-600">{formatCurrency(amt)}</span> : '—';
      }
    },
    {
      key: 'deductions', label: 'Deductions',
      render: (v, row) => {
        const total = (v || 0) + (row.late_deduction || 0) + (row.leave_deduction || 0);
        return total > 0 ? <span className="text-red-600">-{formatCurrency(total)}</span> : '—';
      }
    },
    { key: 'net_salary', label: 'Net Salary', render: v => <span className="font-bold">{formatCurrency(v || 0)}</span> },
    { key: 'present_days', label: 'Days', render: (v, row) => `${v || 0}/${row.total_days || 0}` },
    {
      key: 'payment_status', label: 'Status',
      render: (v, row) => v === 'paid'
        ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs">Paid</Badge>
        : canApprove('payroll')
          ? <Button size="sm" variant="outline" className="h-6 text-xs" onClick={e => { e.stopPropagation(); markPaid.mutate(row); }}>Mark Paid</Button>
          : <Badge variant="outline" className="text-xs">Pending</Badge>
    },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          {canUpdate('payroll') && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDelete('payroll') && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleting(row); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Payroll" description="Monthly salary management">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate('payroll') && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Generate Payroll
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Net Payroll" value={formatCurrency(totalNet)} icon={DollarSign} delay={0} />
        <SummaryCard title="Paid" value={formatCurrency(totalPaid)} icon={CheckCircle} delay={0.05} />
        <SummaryCard title="Pending Salaries" value={pendingCount} icon={Clock} delay={0.1} />
        <SummaryCard title="Total Deductions" value={formatCurrency(totalDeductions)} icon={TrendingDown} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchKey="employee_name"
        expandedContent={(row) => <PayrollExpandedRow row={row} />}
      />

      {showForm && (
        <PayrollForm
          record={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['payrolls'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Payroll"
        description="Delete this payroll record?"
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}