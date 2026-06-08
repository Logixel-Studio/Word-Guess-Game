import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, Users, AlertTriangle, CalendarOff, BarChart3, Zap, UserCheck, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const priorityColors = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-200',
  high: 'bg-amber-500/10 text-amber-700 border-amber-200',
  urgent: 'bg-red-500/10 text-red-700 border-red-200',
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-5))'];

export default function ManagerDashboard() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 200) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 300) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  const { data: leaves = [] } = useQuery({ queryKey: ['leaves'], queryFn: () => base44.entities.LeaveRequest.list('-created_date', 100) });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LeaveRequest.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Updated'); }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task updated'); }
  });

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  const todayAtt = attendance.filter(a => a.date === today);
  const presentToday = todayAtt.filter(a => ['present', 'late'].includes(a.status)).length;
  const lateToday = todayAtt.filter(a => a.status === 'late').length;

  const thisMonthAtt = attendance.filter(a => a.date?.startsWith(thisMonth));
  const totalOT = thisMonthAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0);

  const taskStatusData = [
    { name: 'Todo', count: todoTasks, fill: 'hsl(var(--chart-2))' },
    { name: 'In Progress', count: inProgressTasks, fill: 'hsl(var(--chart-3))' },
    { name: 'Review', count: tasks.filter(t => t.status === 'review').length, fill: 'hsl(var(--chart-4))' },
    { name: 'Done', count: doneTasks, fill: 'hsl(var(--chart-1))' },
  ];

  // Attendance last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const dayAtt = attendance.filter(a => a.date === ds);
    return { date: ds.slice(5), present: dayAtt.filter(a => ['present', 'late'].includes(a.status)).length, late: dayAtt.filter(a => a.status === 'late').length };
  });

  // Per-employee performance
  const empPerf = employees.filter(e => e.status === 'active').slice(0, 8).map(e => {
    const empTasks = tasks.filter(t => t.assigned_to_id === e.id);
    const empAtt = thisMonthAtt.filter(a => a.employee_id === e.id);
    return {
      name: e.full_name?.split(' ')[0] || 'N/A',
      done: empTasks.filter(t => t.status === 'done').length,
      open: empTasks.filter(t => !['done', 'cancelled'].includes(t.status)).length,
      present: empAtt.filter(a => ['present', 'late'].includes(a.status)).length,
    };
  });

  return (
    <div>
      <PageHeader title="Team Command Center" description="Team productivity, attendance and task management">
        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Manager</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        <SummaryCard title="Active Employees" value={employees.filter(e => e.status === 'active').length} icon={Users} delay={0} />
        <SummaryCard title="Present Today" value={presentToday} icon={UserCheck} delay={0.04} />
        <SummaryCard title="Late Today" value={lateToday} icon={Clock} delay={0.08} />
        <SummaryCard title="OT Hours (Month)" value={totalOT.toFixed(1) + 'h'} icon={Zap} delay={0.12} />
        <SummaryCard title="Todo Tasks" value={todoTasks} icon={CheckSquare} delay={0.16} />
        <SummaryCard title="In Progress" value={inProgressTasks} icon={BarChart3} delay={0.20} />
        <SummaryCard title="Urgent Tasks" value={urgentTasks} icon={AlertTriangle} delay={0.24} />
        <SummaryCard title="Pending Leaves" value={pendingLeaves} icon={CalendarOff} delay={0.28} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Task Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="count" label={({ name, count }) => count > 0 ? `${name}: ${count}` : ''} labelLine={false} fontSize={10}>
                {taskStatusData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Attendance Trend — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" name="Present" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Employee Task Performance (This Month)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={empPerf}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="done" name="Done" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="open" name="Open" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Leave Requests</h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">{pendingLeaves} pending</Badge>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {leaves.filter(l => l.status === 'pending').slice(0, 5).map(l => (
              <div key={l.id} className="py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{l.employee_name}</p>
                  <span className="text-xs text-muted-foreground">{l.days}d</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize mb-1">{l.leave_type} · {formatDate(l.from_date)}</p>
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-xs px-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: 'approved' })}>✓</Button>
                  <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: 'rejected' })}>✗</Button>
                </div>
              </div>
            ))}
            {pendingLeaves === 0 && <p className="text-sm text-muted-foreground text-center py-4">No pending</p>}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Active Tasks — Team Overview</h3>
          <Badge variant="outline">{tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length} open</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
          {tasks.filter(t => !['done', 'cancelled'].includes(t.status)).slice(0, 10).map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.assigned_to_name || 'Unassigned'}{t.due_date ? ` · Due: ${formatDate(t.due_date)}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline" className={cn('text-xs', priorityColors[t.priority])}>{t.priority}</Badge>
                <select className="text-xs border border-border rounded px-1 py-0.5 bg-background"
                  value={t.status}
                  onChange={e => updateTaskMutation.mutate({ id: t.id, status: e.target.value })}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}