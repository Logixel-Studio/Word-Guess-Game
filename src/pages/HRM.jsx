import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import LeaveRequestForm from '@/components/hrm/LeaveRequestForm';
import LeaveExpandedRow from '@/components/hrm/LeaveExpandedRow';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CalendarOff, CheckCircle, XCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-500/10 text-red-700 border-red-200',
};
const leaveTypeLabels = {
  annual: 'Annual', sick: 'Sick', casual: 'Casual', maternity: 'Maternity', unpaid: 'Unpaid',
};

export default function HRM() {
  const { canCreate, canUpdate, canDelete, canApprove } = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date', 500),
  });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;
  const totalDays = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LeaveRequest.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave request updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaveRequest.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Deleted'); setDeleting(null); },
  });

  const columns = [
    { key: 'employee_name', label: 'Employee', render: v => <span className="font-medium text-sm">{v || '—'}</span> },
    { key: 'leave_type', label: 'Type', render: v => <Badge variant="outline" className="text-xs">{leaveTypeLabels[v] || v}</Badge> },
    { key: 'from_date', label: 'From', render: v => formatDate(v) },
    { key: 'to_date', label: 'To', render: v => formatDate(v) },
    { key: 'days', label: 'Days', render: v => <span className="font-medium">{v || 1}</span> },
    { key: 'reason', label: 'Reason', render: v => <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{v || '—'}</span> },
    { key: 'status', label: 'Status', render: (v, row) => (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={cn('text-xs capitalize', statusColors[v])}>{v}</Badge>
        {v === 'pending' && canApprove('leave_requests') && (
          <>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600" title="Approve" onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: 'approved' }); }}>
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" title="Reject" onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: row.id, status: 'rejected' }); }}>
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    )},
    { key: 'id', label: '', render: (_, row) => (
      <div className="flex gap-1">
        {canUpdate('leave_requests') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
        {canDelete('leave_requests') && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleting(row); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="HRM — Leave Management" description="Manage employee leave requests">
        {canCreate('leave_requests') && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Add Leave Request</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Pending" value={pendingCount} icon={Clock} delay={0} />
        <SummaryCard title="Approved" value={approvedCount} icon={CheckCircle} delay={0.05} />
        <SummaryCard title="Rejected" value={rejectedCount} icon={XCircle} delay={0.1} />
        <SummaryCard title="Total Leave Days" value={totalDays} icon={CalendarOff} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        data={leaves}
        isLoading={isLoading}
        searchKey="employee_name"
        expandedContent={(row) => <LeaveExpandedRow record={row} />}
      />

      {showForm && (
        <LeaveRequestForm
          record={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['leaves'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Leave Request"
        description="Delete this leave request?"
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}