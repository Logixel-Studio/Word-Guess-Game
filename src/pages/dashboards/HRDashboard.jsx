import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import SummaryCard from '@/components/shared/SummaryCard';
import PageHeader from '@/components/shared/PageHeader';
import { motion } from 'framer-motion';
import { Users, UserCheck, CalendarOff, DollarSign, Clock, AlertTriangle, MapPin, Zap, TrendingDown, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-5))'];

export default function HRDashboard() {
  const qc = useQueryClient();
  const { formatCurrency } = useCurrency();
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 500) });
  const { data: leaves = [] } = useQuery({ queryKey: ['leaves'], queryFn: () => base44.entities.LeaveRequest.list('-created_date', 200) });
  const { data: payrolls = [] } = useQuery({ queryKey: ['payrolls'], queryFn: () => base44.entities.Payroll.list('-month', 100) });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LeaveRequest.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Leave request updated'); }
  });

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const activeEmp = employees.filter(e => e.status === 'active').length;
  const onLeaveEmp = employees.filter(e => e.status === 'on_leave').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const monthPayroll = payrolls.filter(p => p.month === thisMonth);
  const totalPayrollAmt = monthPayroll.reduce((s, p) => s + (p.net_salary || 0), 0);
  const pendingPayroll = monthPayroll.filter(p => p.payment_status === 'pending').length;

  const todayAtt = attendance.filter(a => a.date === today);
  const presentToday = todayAtt.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateToday = todayAtt.filter(a => a.status === 'late').length;

  const thisMonthAtt = attendance.filter(a => a.date?.startsWith(thisMonth));
  const totalOT = thisMonthAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const totalLateMin = thisMonthAtt.reduce((s, a) => s + (a.late_minutes || 0), 0);

  const deptBreakdown = employees.reduce((acc, e) => {
    const d = e.department || 'Other'; acc[d] = (acc[d] || 0) + 1; return acc;
  }, {});
  const deptData = Object.entries(deptBreakdown).map(([name, value]) => ({ name, value }));

  const leaveTypeData = ['annual', 'sick', 'casual', 'maternity', 'unpaid'].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    approved: leaves.filter(l => l.leave_type === t && l.status === 'approved').length,
    pending: leaves.filter(l => l.leave_type === t && l.status === 'pending').length,
  })).filter(d => d.approved > 0 || d.pending > 0);

  // Attendance last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const dayAtt = attendance.filter(a => a.date === ds);
    return { date: ds.slice(5), present: dayAtt.filter(a => ['present', 'late'].includes(a.status)).length, late: dayAtt.filter(a => a.status === 'late').length };
  });

  return (
    <div>
      <PageHeader title="HR Command Center" description="Workforce management — payroll, attendance, leaves">
        <Badge variant="outline" className="text-pink-600 border-pink-300 bg-pink-50">HR Manager</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        <SummaryCard title="Total Employees" value={employees.length} icon={Users} delay={0} />
        <SummaryCard title="Active" value={activeEmp} icon={UserCheck} delay={0.04} />
        <SummaryCard title="Present Today" value={presentToday} icon={CheckSquare} delay={0.08} />
        <SummaryCard title="Late Today" value={lateToday} icon={Clock} delay={0.12} />
        <SummaryCard title="On Leave" value={onLeaveEmp} icon={CalendarOff} delay={0.16} />
        <SummaryCard title="Pending Leaves" value={pendingLeaves} icon={AlertTriangle} delay={0.20} />
        <SummaryCard title="Monthly Payroll" value={formatCurrency(totalPayrollAmt)} icon={DollarSign} delay={0.24} />
        <SummaryCard title="OT Hours (Month)" value={totalOT.toFixed(1) + 'h'} icon={Zap} delay={0.28} />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}:${value}`} labelLine={false} fontSize={10}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Attendance (7 Days)</h3>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Leave Types Overview</h3>
          {leaveTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leaveTypeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" name="Approved" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No leave data</p>}
        </motion.div>
      </div>

      {/* Pending Leaves Approval */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Pending Leave Approvals</h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{pendingLeaves} pending</Badge>
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {leaves.filter(l => l.status === 'pending').slice(0, 8).map(l => (
              <div key={l.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{l.employee_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{l.leave_type} · {l.days} day(s) · {formatDate(l.from_date)} → {formatDate(l.to_date)}</p>
                  {l.reason && <p className="text-xs text-muted-foreground italic truncate">{l.reason}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: 'rejected' })}>Reject</Button>
                </div>
              </div>
            ))}
            {pendingLeaves === 0 && <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Monthly Analytics</h3>
          <div className="space-y-3">
            {[
              { label: 'Total OT Hours (Month)', value: totalOT.toFixed(1) + 'h', color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Total Late Minutes (Month)', value: totalLateMin + ' min', color: 'text-red-600', bg: 'bg-red-500/10' },
              { label: 'Pending Payroll Slips', value: pendingPayroll, color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { label: 'Payroll Amount (Month)', value: formatCurrency(totalPayrollAmt), color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Attendance Rate (Today)', value: activeEmp > 0 ? `${Math.round((presentToday / activeEmp) * 100)}%` : '—', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            ].map(m => (
              <div key={m.label} className={cn('flex items-center justify-between rounded-lg px-3 py-2', m.bg)}>
                <span className="text-xs font-medium">{m.label}</span>
                <span className={cn('text-sm font-bold', m.color)}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Today's Check-in Feed</h4>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {todayAtt.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium truncate">{a.employee_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground">{a.check_in}</span>
                    <Badge variant="outline" className={cn('text-xs', a.status === 'late' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{a.status}</Badge>
                  </div>
                </div>
              ))}
              {todayAtt.length === 0 && <p className="text-xs text-muted-foreground">No check-ins yet</p>}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}