import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/lib/PermissionsContext';
import { formatDate, formatNumber } from '@/lib/formatters';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ActionForm from '@/components/actions/ActionForm';
import ActionExpandedRow from '@/components/actions/ActionExpandedRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, AlertTriangle, Flag, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function ActionCenter() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['actions'],
    queryFn: () => base44.entities.Action.list('-created_date', 500),
  });

  // Realtime
  useEffect(() => {
    const unsub = base44.entities.Action.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['actions'] });
    });
    return unsub;
  }, [qc]);

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Action.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['actions'] }); toast.success('Action deleted'); setDeleteId(null); },
  });

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return actions.filter(a => {
      if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (searchTerm && !a.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [actions, filterPriority, filterStatus, searchTerm]);

  const totalActions = actions.length;
  const critical = actions.filter(a => a.priority === 'critical' && a.status !== 'completed' && a.status !== 'cancelled').length;
  const high = actions.filter(a => a.priority === 'high' && a.status !== 'completed' && a.status !== 'cancelled').length;
  const dueToday = actions.filter(a => a.due_date === today && a.status !== 'completed' && a.status !== 'cancelled').length;
  const overdue = actions.filter(a => a.due_date && a.due_date < today && a.status !== 'completed' && a.status !== 'cancelled').length;
  const completed = actions.filter(a => a.status === 'completed').length;

  const columns = [
    {
      key: 'title', label: 'Title',
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm">{v}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{row.description}</p>}
        </div>
      )
    },
    {
      key: 'priority', label: 'Priority',
      render: v => (
        <Badge variant="outline" className={cn('text-xs', PRIORITY_STYLES[v])}>
          {v?.charAt(0).toUpperCase() + v?.slice(1)}
        </Badge>
      )
    },
    {
      key: 'status', label: 'Status',
      render: v => (
        <Badge className={cn('text-xs border-0', STATUS_STYLES[v])}>
          {v?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </Badge>
      )
    },
    {
      key: 'due_date', label: 'Due Date',
      render: (v, row) => {
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        const isOverdue = v < today && row.status !== 'completed' && row.status !== 'cancelled';
        const isDueToday = v === today;
        return (
          <span className={cn('text-xs', isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
            {formatDate(v)}{isOverdue ? ' ⚠' : ''}
          </span>
        );
      }
    },
    {
      key: 'reminder_date', label: 'Reminder',
      render: v => <span className="text-xs text-muted-foreground">{v ? formatDate(v) : '—'}</span>
    },
    {
      key: 'created_by_name', label: 'Created By',
      render: v => <span className="text-xs text-muted-foreground">{v || '—'}</span>
    },
  ];

  const expandedContent = (row) => (
    <ActionExpandedRow
      row={row}
      onEdit={(r) => { setEditing(r); setFormOpen(true); }}
      onDelete={setDeleteId}
      canUpdate={canUpdate('action_center')}
      canDelete={canDelete('action_center')}
    />
  );

  return (
    <div>
      <PageHeader title="Action Center" description="Personal work reminders, follow-ups and action items">
        {canCreate('action_center') && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />New Action
          </Button>
        )}
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <SummaryCard title="Total Actions" value={formatNumber(totalActions)} icon={Target} delay={0} />
        <SummaryCard title="Critical" value={formatNumber(critical)} icon={AlertTriangle} delay={0.05} className={critical > 0 ? 'border-red-200 dark:border-red-900' : ''} />
        <SummaryCard title="High Priority" value={formatNumber(high)} icon={Flag} delay={0.1} />
        <SummaryCard title="Due Today" value={formatNumber(dueToday)} icon={Clock} delay={0.15} className={dueToday > 0 ? 'border-amber-200' : ''} />
        <SummaryCard title="Overdue" value={formatNumber(overdue)} icon={TrendingUp} delay={0.2} className={overdue > 0 ? 'border-red-200 dark:border-red-900' : ''} />
        <SummaryCard title="Completed" value={formatNumber(completed)} icon={CheckCircle2} delay={0.25} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Search actions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-8 text-xs" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterPriority !== 'all' || filterStatus !== 'all' || searchTerm) && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{filtered.length} of {actions.length}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setFilterPriority('all'); setFilterStatus('all'); setSearchTerm(''); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} expandedContent={expandedContent} pageSize={15} />

      <ActionForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} onSaved={() => qc.invalidateQueries({ queryKey: ['actions'] })} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Action?" description="This will permanently delete this action." />
    </div>
  );
}