import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, CheckCircle2, Link2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import AuditInfo from '@/components/shared/AuditInfo';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { makeUpdatedBy } from '@/lib/auditUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function ActionExpandedRow({ row, onEdit, onDelete, canUpdate, canDelete: canDel }) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => base44.entities.Action.update(row.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by_name: currentUser?.full_name || 'Unknown',
      ...makeUpdatedBy(currentUser),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['actions'] }); toast.success('Action marked as completed'); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = row.due_date && row.due_date < today && row.status !== 'completed' && row.status !== 'cancelled';

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Priority</p>
          <Badge variant="outline" className={cn('text-xs', PRIORITY_STYLES[row.priority])}>
            {row.priority?.charAt(0).toUpperCase() + row.priority?.slice(1)}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <Badge variant="outline" className={cn('text-xs', STATUS_STYLES[row.status])}>
            {row.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className={cn('font-medium', isOverdue ? 'text-red-600' : '')}>{formatDate(row.due_date) || '—'}{isOverdue ? ' (Overdue)' : ''}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reminder Date</p>
          <p>{formatDate(row.reminder_date) || '—'}</p>
        </div>
      </div>

      {row.description && (
        <div><p className="text-xs text-muted-foreground">Description</p><p>{row.description}</p></div>
      )}
      {row.notes && (
        <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-muted-foreground">{row.notes}</p></div>
      )}

      {/* Links */}
      {(row.linked_client_name || row.linked_supplier_name || row.linked_invoice_number || row.linked_employee_name) && (
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Link2 className="w-3 h-3" />Linked Records
          </p>
          <div className="flex flex-wrap gap-2">
            {row.linked_client_name && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Client: {row.linked_client_name}</Badge>}
            {row.linked_supplier_name && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Supplier: {row.linked_supplier_name}</Badge>}
            {row.linked_invoice_number && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Invoice: {row.linked_invoice_number}</Badge>}
            {row.linked_employee_name && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Employee: {row.linked_employee_name}</Badge>}
          </div>
        </div>
      )}

      {row.status === 'completed' && row.completed_by_name && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Completed by <span className="font-medium">{row.completed_by_name}</span> on {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : '—'}
        </div>
      )}

      <AuditInfo record={row} />

      <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
        {canUpdate && <Button variant="outline" size="sm" onClick={() => onEdit(row)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>}
        {canUpdate && row.status !== 'completed' && (
          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            <CheckCircle2 className="w-3 h-3 mr-1" />Complete
          </Button>
        )}
        {canDel && <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => onDelete(row.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>}
      </div>
    </div>
  );
}