import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmployeeForm from '@/components/employees/EmployeeForm';
import EmployeeProfileDrawer from '@/components/employees/EmployeeProfileDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, UserCheck, UserX, Briefcase, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { usePermissions } from '@/lib/PermissionsContext';
import { useCurrency } from '@/lib/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  inactive: 'bg-red-500/10 text-red-700 border-red-200',
  on_leave: 'bg-amber-500/10 text-amber-700 border-amber-200',
};
const roleLabels = {
  employee: 'Employee', manager: 'Manager', accountant: 'Accountant',
  hr_manager: 'HR Manager', inventory_manager: 'Inv. Manager',
  sales_manager: 'Sales Manager', admin: 'Admin', super_admin: 'Super Admin',
};

export default function Employees() {
  const { formatCurrency } = useCurrency();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); setDeleting(null); },
  });

  const activeCount = employees.filter(e => e.status === 'active').length;
  const inactiveCount = employees.filter(e => e.status === 'inactive').length;
  const onLeaveCount = employees.filter(e => e.status === 'on_leave').length;
  const totalPayroll = employees.filter(e => e.status === 'active').reduce((s, e) => s + (e.basic_salary || 0), 0);

  const columns = [
    { key: 'employee_id', label: 'ID', render: v => <span className="text-xs font-mono text-muted-foreground">{v || '—'}</span> },
    { key: 'full_name', label: 'Name', render: (v, row) => (
      <div>
        <p className="font-medium text-sm">{v}</p>
        <p className="text-xs text-muted-foreground">{row.designation || row.department || ''}</p>
      </div>
    )},
    { key: 'role', label: 'Role', render: v => <Badge variant="outline" className="text-xs">{roleLabels[v] || v}</Badge> },
    { key: 'department', label: 'Department', render: v => v || '—' },
    { key: 'basic_salary', label: 'Salary', render: v => <span className="font-medium">{formatCurrency(v || 0)}</span> },
    { key: 'joining_date', label: 'Joined', render: v => v ? formatDate(v) : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn('text-xs', statusColors[v])}>{v?.replace('_', ' ')}</Badge>
        {row.notes === 'setup_pending' && <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">Setup Pending</Badge>}
      </div>
    )},
    { key: 'id', label: '', render: (_, row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={e => { e.stopPropagation(); setViewing(row); }}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {canUpdate('employees') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
        {canDelete('employees') && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleting(row); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Employees" description="Manage your workforce">
        {canCreate('employees') && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Add Employee</Button>}
      </PageHeader>

      {/* Setup pending banner */}
      {employees.filter(e => e.notes === 'setup_pending').length > 0 && (
        <div className="flex items-start gap-2.5 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">{employees.filter(e => e.notes === 'setup_pending').length} employee{employees.filter(e => e.notes === 'setup_pending').length > 1 ? 's' : ''} need setup completion.</span>
            {' '}Click Edit to fill in department, salary, shift, GPS location, and other details.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Employees" value={employees.length} icon={Users} delay={0} />
        <SummaryCard title="Active" value={activeCount} icon={UserCheck} delay={0.05} />
        <SummaryCard title="On Leave" value={onLeaveCount} icon={Briefcase} delay={0.1} />
        <SummaryCard title="Monthly Payroll" value={formatCurrency(totalPayroll)} icon={UserX} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        searchKey="full_name"
        onRowClick={row => setViewing(row)}
      />

      {/* Profile Drawer */}
      {viewing && (
        <EmployeeProfileDrawer
          employee={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setShowForm(true); setViewing(null); }}
        />
      )}

      {showForm && (
        <EmployeeForm
          employee={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Employee"
        description={`Are you sure you want to delete ${deleting?.full_name}?`}
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}