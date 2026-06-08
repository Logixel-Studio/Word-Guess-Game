import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import SummaryCard from '@/components/shared/SummaryCard';
import TaskForm from '@/components/tasks/TaskForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, Clock, AlertTriangle, ListTodo, Pencil, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import TaskExpandedRow from '@/components/tasks/TaskExpandedRow';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

export default function Tasks() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });

  const filtered = useMemo(() => {
    let r = tasks;
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') r = r.filter(t => t.priority === priorityFilter);
    if (search) r = r.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.assigned_to_name?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [tasks, statusFilter, priorityFilter, search]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted'); setDeleting(null); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status, ...(status === 'done' ? { completed_date: new Date().toISOString().slice(0, 10) } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  return (
    <div>
      <PageHeader title="Task Management" description="Assign and track team tasks">
        {canCreate('tasks') && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Add Task</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="To Do" value={todoCount} icon={ListTodo} delay={0} />
        <SummaryCard title="In Progress" value={inProgressCount} icon={Clock} delay={0.05} />
        <SummaryCard title="Completed" value={doneCount} icon={CheckSquare} delay={0.1} />
        <SummaryCard title="Urgent" value={urgentCount} icon={AlertTriangle} delay={0.15} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-3 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks found</p>
            </div>
          )}
          {filtered.map(task => {
            const isExpanded = expandedId === task.id;
            const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      {task.assigned_to_name && <p className="text-xs text-muted-foreground">→ {task.assigned_to_name}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>{task.priority}</Badge>
                      <Badge variant="outline" className={cn('text-xs', statusColors[task.status])}>{task.status?.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.department && <span>{task.department}</span>}
                    </div>
                    <div className="text-xs">
                      {task.due_date && (
                        <span className={cn(isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                          Due: {formatDate(task.due_date)} {isOverdue && '⚠ Overdue'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate('tasks') && <Select value={task.status} onValueChange={v => updateStatus.mutate({ id: task.id, status: v })}>
                      <SelectTrigger className="w-28 h-7 text-xs" onClick={e => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>}
                    {canUpdate('tasks') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditing(task); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                    {canDelete('tasks') && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeleting(task); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/20">
                        <TaskExpandedRow task={task} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Task"
        description={`Delete "${deleting?.title}"?`}
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}