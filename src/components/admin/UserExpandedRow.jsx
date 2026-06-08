import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/formatters';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roleConfig';
import { cn } from '@/lib/utils';
import { MapPin, Clock, CalendarOff, CheckSquare, DollarSign, AlertCircle, Pencil, Trash2 } from 'lucide-react';

const Field = ({ label, value, className }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className={cn('text-sm font-medium truncate text-foreground', className)}>{value || '—'}</p>
  </div>
);

export default function UserExpandedRow({ user, onEdit, onDelete }) {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 30000,
  });

  const employee = employees.find(e => e.email === user.email || e.full_name === user.full_name);
  const empId = employee?.id;

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-emp', empId],
    queryFn: () => base44.entities.Attendance.filter({ employee_id: empId }, '-date', 30),
    enabled: !!empId,
    staleTime: 30000,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves-emp', empId],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_id: empId }, '-created_date', 20),
    enabled: !!empId,
    staleTime: 30000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-emp', empId],
    queryFn: () => base44.entities.Task.filter({ assigned_to_id: empId }),
    enabled: !!empId,
    staleTime: 30000,
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ['payrolls-emp', empId],
    queryFn: () => base44.entities.Payroll.filter({ employee_id: empId }, '-month', 6),
    enabled: !!empId,
    staleTime: 30000,
  });

  const { data: empLocations = [] } = useQuery({
    queryKey: ['emp-locations', empId],
    queryFn: () => base44.entities.EmployeeLocation.filter({ employee_id: empId }),
    enabled: !!empId,
    staleTime: 30000,
  });

  const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
  const openTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length;
  const lastPayroll = payrolls[0];
  const isSetupPending = employee?.notes === 'setup_pending';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Setup pending banner */}
      {isSetupPending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Employee profile created automatically — complete setup in the Employees section
        </div>
      )}

      {/* User details + action buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-background rounded-lg border border-border">
          <Field label="Full Name" value={user.full_name} />
          <Field label="Email" value={user.email} />
          <Field label="Role" value={ROLE_LABELS[user.role] || user.role} className={ROLE_COLORS[user.role]} />
          <Field label="Joined" value={formatDate(user.created_date)} />
          <Field label="User ID" value={user.id?.slice(0, 8) + '...'} />
        </div>
        <div className="flex gap-2 flex-shrink-0 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={e => { e.stopPropagation(); onEdit?.(); }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={e => { e.stopPropagation(); onDelete?.(); }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Employee details (if linked) */}
      {employee ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-background rounded-lg border border-border">
            <Field label="Employee ID" value={employee.employee_id} />
            <Field label="Department" value={employee.department} />
            <Field label="Designation" value={employee.designation} />
            <Field label="Shift" value={employee.shift_start && employee.shift_end ? `${employee.shift_start} – ${employee.shift_end}` : null} />
            <Field label="Basic Salary" value={employee.basic_salary ? `Rs ${Number(employee.basic_salary).toLocaleString()}` : null} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Status</p>
              <Badge variant="outline" className={cn('text-xs capitalize mt-0.5',
                employee.status === 'active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                employee.status === 'inactive' ? 'text-red-600 border-red-200 bg-red-50' :
                'text-amber-600 border-amber-200 bg-amber-50'
              )}>
                {employee.status?.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Summaries */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-background rounded-lg border border-border flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-50 rounded-lg"><Clock className="w-3.5 h-3.5 text-emerald-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Attendance (30d)</p>
                <p className="text-sm font-semibold">{presentDays} present · {lateDays} late</p>
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 rounded-lg"><CalendarOff className="w-3.5 h-3.5 text-blue-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leaves</p>
                <p className="text-sm font-semibold">{approvedLeaves} approved · {pendingLeaves} pending</p>
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-50 rounded-lg"><CheckSquare className="w-3.5 h-3.5 text-purple-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tasks</p>
                <p className="text-sm font-semibold">{openTasks} open · {tasks.length} total</p>
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-50 rounded-lg"><DollarSign className="w-3.5 h-3.5 text-amber-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Payroll</p>
                <p className="text-sm font-semibold">{lastPayroll ? `${lastPayroll.month} · Rs ${Number(lastPayroll.net_salary).toLocaleString()}` : 'Not processed'}</p>
              </div>
            </div>
          </div>

          {/* GPS locations */}
          {empLocations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS:</span>
              {empLocations.map(l => (
                <Badge key={l.id} variant="outline" className="text-xs">{l.office_location_name}</Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/40 rounded-lg">
          No employee profile linked to this user account.
        </div>
      )}
    </motion.div>
  );
}