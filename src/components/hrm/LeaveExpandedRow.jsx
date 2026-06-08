import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import AuditInfo from '@/components/shared/AuditInfo';
import { CalendarOff, User, Building2, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-500/10 text-red-700 border-red-200',
};

const leaveTypeLabels = {
  annual: 'Annual Leave', sick: 'Sick Leave', casual: 'Casual Leave',
  maternity: 'Maternity Leave', unpaid: 'Unpaid Leave',
};

const Field = ({ label, value, className }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className={cn('text-sm font-medium text-foreground', className)}>{value || '—'}</p>
  </div>
);

export default function LeaveExpandedRow({ record }) {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 60000,
  });

  const employee = employees.find(e => e.id === record.employee_id);

  // Salary deduction estimate for unpaid leaves
  const salaryDeduction = record.leave_type === 'unpaid' && employee?.basic_salary
    ? ((employee.basic_salary / 30) * (record.days || 1)).toFixed(0)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Employee + Leave info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-background rounded-lg border border-border">
        <Field label="Employee" value={record.employee_name} />
        <Field label="Employee ID" value={employee?.employee_id} />
        <Field label="Department" value={employee?.department} />
        <Field label="Designation" value={employee?.designation} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Status</p>
          <Badge variant="outline" className={cn('text-xs capitalize', statusColors[record.status])}>
            {record.status}
          </Badge>
        </div>
      </div>

      {/* Leave details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-background rounded-lg border border-border">
        <Field label="Leave Type" value={leaveTypeLabels[record.leave_type] || record.leave_type} />
        <Field label="From Date" value={formatDate(record.from_date)} />
        <Field label="To Date" value={formatDate(record.to_date)} />
        <Field label="Duration" value={`${record.days || 1} day${(record.days || 1) > 1 ? 's' : ''}`} />
      </div>

      {/* Reason */}
      {record.reason && (
        <div className="p-3 bg-background rounded-lg border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Leave Reason</p>
          <p className="text-sm text-foreground">{record.reason}</p>
        </div>
      )}

      {/* Impact + Review */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Approval info */}
        <div className="p-3 bg-background rounded-lg border border-border space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Review Details</p>
          {record.reviewed_by ? (
            <div className="flex items-center gap-1.5">
              {record.status === 'approved'
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                : <XCircle className="w-3.5 h-3.5 text-red-600" />}
              <span className="text-sm font-medium">
                {record.status === 'approved' ? 'Approved' : 'Rejected'} by {record.reviewed_by}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Awaiting review</span>
            </div>
          )}
          {record.review_notes && (
            <p className="text-xs text-muted-foreground pl-5">{record.review_notes}</p>
          )}
        </div>

        {/* Impact */}
        <div className="p-3 bg-background rounded-lg border border-border space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impact</p>
          <div className="flex items-center gap-2 text-sm">
            <CalendarOff className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Attendance impact:</span>
            <span className="font-medium">{record.days || 1} absent day{(record.days || 1) > 1 ? 's' : ''}</span>
          </div>
          {salaryDeduction ? (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-muted-foreground">Salary deduction:</span>
              <span className="font-medium text-amber-700">~Rs {Number(salaryDeduction).toLocaleString()}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {record.leave_type === 'unpaid' ? 'No salary data' : 'No salary deduction'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {record.notes && (
        <div className="px-3 py-2 bg-muted/40 rounded-lg text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Notes:</span> {record.notes}
        </div>
      )}

      <AuditInfo record={record} />
    </motion.div>
  );
}