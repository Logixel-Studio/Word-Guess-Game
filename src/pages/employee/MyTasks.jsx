import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertTriangle, BarChart3, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import SummaryCard from '@/components/shared/SummaryCard';
import { toast } from 'sonner';

const priorityStyle = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const statusStyle = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-purple-50 text-purple-700 border-purple-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function MyTasks() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [myEmployee, setMyEmployee] = useState(null);
  const [filter, setFilter] = useState('active');

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  useEffect(() => {
    if (user && employees.length > 0) {
      const emp = employees.find(e => e.email === user.email)
        || employees.find(e => e.full_name === user.full_name);
      setMyEmployee(emp || null);
    }
  }, [user, employees]);

  const empId = myEmployee?.id;
  const empEmail = myEmployee?.email || user?.email;

  // Fetch tasks by employee ID (primary) 
  const { data: tasksByid = [], isLoading: loadingById } = useQuery({
    queryKey: ['my-tasks-id', empId],
    queryFn: () => base44.entities.Task.filter({ assigned_to_id: empId }, '-created_date', 100),
    enabled: !!empId,
  });

  // Fetch tasks by email as fallback (handles cases where ID wasn't stored)
  const { data: tasksByEmail = [], isLoading: loadingByEmail } = useQuery({
    queryKey: ['my-tasks-email', empEmail],
    queryFn: () => base44.entities.Task.filter({ assigned_to_email: empEmail }, '-created_date', 100),
    enabled: !!empEmail && !!empId,
  });

  // Merge and deduplicate
  const tasks = useMemo(() => {
    const seen = new Set();
    return [...tasksByid, ...tasksByEmail].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tasksByid, tasksByEmail]);

  const isLoading = loadingById || loadingByEmail;

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks', empId] }); toast.success('Task updated'); },
  });

  const todo = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && !['done', 'cancelled'].includes(t.status)).length;

  const filtered = tasks.filter(t => {
    if (filter === 'active') return !['done', 'cancelled'].includes(t.status);
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  return (
    <div>
      <PageHeader title="My Tasks" description="View and update your assigned tasks" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Todo" value={todo} icon={CheckSquare} delay={0} />
        <SummaryCard title="In Progress" value={inProgress} icon={BarChart3} delay={0.05} />
        <SummaryCard title="Completed" value={done} icon={CheckCircle} delay={0.1} />
        <SummaryCard title="Urgent" value={urgent} icon={AlertTriangle} delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">My Tasks</h3>
          <div className="flex gap-1">
            {[['active', 'Active'], ['done', 'Done'], ['all', 'All']].map(([val, label]) => (
              <Button key={val} variant={filter === val ? 'default' : 'outline'} size="sm" className="h-7 text-xs"
                onClick={() => setFilter(val)}>{label}</Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>}
          {filtered.map(t => (
            <motion.div key={t.id} layout className="border border-border rounded-xl p-4 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium">{t.title}</p>
                    <Badge variant="outline" className={cn('text-xs', priorityStyle[t.priority])}>{t.priority}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap">
                    {t.due_date && (
                      <span className={cn('text-xs flex items-center gap-1', new Date(t.due_date) < new Date() && t.status !== 'done' ? 'text-red-600' : 'text-muted-foreground')}>
                        <Clock className="w-3 h-3" />Due: {formatDate(t.due_date)}
                      </span>
                    )}
                    {t.department && <span className="text-xs text-muted-foreground">Dept: {t.department}</span>}
                    {t.assigned_by_name && <span className="text-xs text-muted-foreground">By: {t.assigned_by_name}</span>}
                  </div>
                </div>
                <select
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background flex-shrink-0"
                  value={t.status}
                  onChange={e => updateMutation.mutate({ id: t.id, status: e.target.value })}
                  disabled={t.status === 'cancelled'}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </motion.div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              {filter === 'done' ? 'No completed tasks yet' : 'No active tasks assigned'}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}