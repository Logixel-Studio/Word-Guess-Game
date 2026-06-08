import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import AttendanceForm from '@/components/attendance/AttendanceForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, UserCheck, UserX, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import AttendanceExpandedRow from '@/components/attendance/AttendanceExpandedRow';

const statusColors = {
  present: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  absent: 'bg-red-500/10 text-red-700 border-red-200',
  late: 'bg-amber-500/10 text-amber-700 border-amber-200',
  half_day: 'bg-blue-500/10 text-blue-700 border-blue-200',
  on_leave: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

const today = new Date().toISOString().slice(0, 7);

export default function Attendance() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [monthFilter, setMonthFilter] = useState(today);

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 500),
  });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });

  const filtered = useMemo(() =>
    attendance.filter(a => a.date?.startsWith(monthFilter)),
    [attendance, monthFilter]
  );

  const presentCount = filtered.filter(a => a.status === 'present').length;
  const absentCount = filtered.filter(a => a.status === 'absent').length;
  const lateCount = filtered.filter(a => a.status === 'late').length;
  const totalOT = filtered.reduce((s, a) => s + (a.overtime_hours || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Record deleted'); setDeleting(null); },
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const columns = [
    { key: 'employee_name', label: 'Employee', render: v => <span className="font-medium text-sm">{v || '—'}</span> },
    { key: 'date', label: 'Date', render: v => formatDate(v) },
    { key: 'check_in', label: 'Check In', render: v => v || '—' },
    { key: 'check_out', label: 'Check Out', render: v => v || '—' },
    { key: 'working_hours', label: 'Hours', render: v => v ? `${Number(v).toFixed(1)}h` : '—' },
    { key: 'overtime_hours', label: 'OT', render: v => v > 0 ? <span className="text-blue-600 font-medium">{Number(v).toFixed(1)}h</span> : '—' },
    { key: 'late_minutes', label: 'Late', render: v => v > 0 ? <span className="text-amber-600">{v}m</span> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant="outline" className={cn('text-xs capitalize', statusColors[v])}>{v?.replace('_', ' ')}</Badge> },
    { key: 'id', label: '', render: (_, row) => (
      <div className="flex gap-1">
        {canUpdate('attendance') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
        {canDelete('attendance') && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleting(row); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Attendance" description="Track employee attendance and hours">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate('attendance') && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Add Record</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Present" value={presentCount} icon={UserCheck} delay={0} />
        <SummaryCard title="Absent" value={absentCount} icon={UserX} delay={0.05} />
        <SummaryCard title="Late" value={lateCount} icon={AlertTriangle} delay={0.1} />
        <SummaryCard title="Total Overtime" value={`${totalOT.toFixed(1)}h`} icon={Clock} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchKey="employee_name"
        expandedContent={(row) => <AttendanceExpandedRow record={row} />}
      />

      {showForm && (
        <AttendanceForm
          record={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['attendance'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Record"
        description="Delete this attendance record?"
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}