import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import AuditInfo from '@/components/shared/AuditInfo';
import { User, Calendar, Building2, Flag, CheckSquare, Clock, FileText } from 'lucide-react';

const priorityColors = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-200',
  high: 'bg-amber-500/10 text-amber-700 border-amber-200',
  urgent: 'bg-red-500/10 text-red-700 border-red-200',
};

const statusColors = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
  review: 'bg-purple-500/10 text-purple-700 border-purple-200',
  done: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-500/10 text-red-700 border-red-200',
};

const Field = ({ label, value, className }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className={cn('text-sm font-medium text-foreground', className)}>{value || '—'}</p>
  </div>
);

export default function TaskExpandedRow({ task }) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Assignment info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-background rounded-lg border border-border">
        <Field label="Assigned To" value={task.assigned_to_name} />
        <Field label="Assigned By" value={task.assigned_by_name} />
        <Field label="Department" value={task.department} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Priority</p>
          <Badge variant="outline" className={cn('text-xs capitalize', priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Status</p>
          <Badge variant="outline" className={cn('text-xs', statusColors[task.status])}>
            {task.status?.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-background rounded-lg border border-border">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Created</p>
          <p className="text-sm font-medium">{formatDate(task.created_date)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Due Date</p>
          <p className={cn('text-sm font-medium', isOverdue ? 'text-red-600' : 'text-foreground')}>
            {task.due_date ? formatDate(task.due_date) : '—'}
            {isOverdue && <span className="ml-1 text-xs text-red-500">⚠ Overdue</span>}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Completed</p>
          <p className="text-sm font-medium">{task.completed_date ? formatDate(task.completed_date) : '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Last Updated</p>
          <p className="text-sm font-medium">{formatDate(task.updated_date)}</p>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Description</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div className="px-3 py-2 bg-muted/40 rounded-lg text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Notes:</span> {task.notes}
        </div>
      )}

      <AuditInfo record={task} />
    </motion.div>
  );
}