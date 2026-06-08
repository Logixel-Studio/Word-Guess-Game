import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  User, MapPin, Clock, DollarSign, Calendar, Activity,
  FileText, CheckSquare, AlertTriangle, Zap, Phone, Mail,
  Building2, CreditCard, IdCard, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import EmployeeLocationAssignment from './EmployeeLocationAssignment';

const statusColors = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  inactive: 'bg-red-500/10 text-red-700 border-red-200',
  on_leave: 'bg-amber-500/10 text-amber-700 border-amber-200',
};

const attColors = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  on_leave: 'bg-purple-50 text-purple-700 border-purple-200',
  half_day: 'bg-blue-50 text-blue-700 border-blue-200',
};

function InfoRow({ icon: IconComp, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
      <IconComp className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfileDrawer({ employee, onClose, onEdit }) {
  const { formatCurrency } = useCurrency();
  const [tab, setTab] = useState('overview');

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-emp', employee?.id],
    queryFn: () => base44.entities.Attendance.filter({ employee_id: employee.id }, '-date', 60),
    enabled: !!employee?.id,
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ['payroll-emp', employee?.id],
    queryFn: () => base44.entities.Payroll.filter({ employee_id: employee.id }, '-month', 12),
    enabled: !!employee?.id,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves-emp', employee?.id],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_id: employee.id }, '-created_date', 20),
    enabled: !!employee?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-emp', employee?.id],
    queryFn: () => base44.entities.Task.filter({ assigned_to_id: employee.id }, '-created_date', 20),
    enabled: !!employee?.id,
  });

  if (!employee) return null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthAtt = attendance.filter(a => a.date?.startsWith(thisMonth));
  const presentDays = monthAtt.filter(a => ['present', 'late'].includes(a.status)).length;
  const lateDays = monthAtt.filter(a => a.status === 'late').length;
  const totalOT = attendance.reduce((s, a) => s + (Number(a.overtime_hours) || 0), 0);
  const activeTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length;

  return (
    <Sheet open={!!employee} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-card p-5 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
                {employee.profile_photo
                  ? <img src={employee.profile_photo} alt="" className="w-full h-full object-cover" />
                  : employee.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-lg">{employee.full_name}</h2>
                <p className="text-sm text-muted-foreground">{employee.designation || employee.department || 'No designation'}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs', statusColors[employee.status])}>
                    {employee.status?.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {employee.role?.replace('_', ' ')}
                  </Badge>
                  {employee.employee_id && (
                    <Badge variant="outline" className="text-xs font-mono bg-card">
                      {employee.employee_id}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Present (Mo)', value: presentDays, color: 'text-emerald-600' },
              { label: 'Late (Mo)', value: lateDays, color: 'text-amber-600' },
              { label: 'OT Hours', value: `${totalOT.toFixed(1)}h`, color: 'text-primary' },
              { label: 'Active Tasks', value: activeTasks, color: 'text-blue-600' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-lg border border-border p-2 text-center">
                <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-5 h-8 mb-4">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="gps" className="text-xs">GPS Locations</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Personal Info</p>
                  <InfoRow icon={Mail} label="Email" value={employee.email} />
                  <InfoRow icon={Phone} label="Phone" value={employee.phone} />
                  <InfoRow icon={IdCard} label="CNIC" value={employee.cnic} />
                  <InfoRow icon={MapPin} label="Address" value={employee.address} />
                </div>
                <div className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Employment</p>
                  <InfoRow icon={Building2} label="Department" value={employee.department} />
                  <InfoRow icon={User} label="Designation" value={employee.designation} />
                  <InfoRow icon={Calendar} label="Joined" value={employee.joining_date ? formatDate(employee.joining_date) : null} />
                  <InfoRow icon={CreditCard} label="Bank Account" value={employee.bank_account} />
                </div>
                <div className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Salary & Shifts</p>
                  <InfoRow icon={DollarSign} label="Basic Salary" value={formatCurrency(employee.basic_salary || 0)} />
                  <InfoRow icon={Clock} label="Shift Start" value={employee.shift_start} />
                  <InfoRow icon={Clock} label="Shift End" value={employee.shift_end} />
                  <InfoRow icon={AlertTriangle} label="Grace Period" value={employee.grace_minutes ? `${employee.grace_minutes} minutes` : null} />
                  <InfoRow icon={Zap} label="Overtime Rate" value={employee.overtime_rate ? `${employee.overtime_rate}×` : null} />
                </div>
                <div className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Leave Summary</p>
                  {leaves.length === 0
                    ? <p className="text-xs text-muted-foreground py-2">No leave records</p>
                    : leaves.slice(0, 4).map(l => (
                      <div key={l.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                        <div>
                          <p className="text-xs font-medium capitalize">{l.leave_type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(l.from_date)} – {formatDate(l.to_date)}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', l.status === 'approved' ? 'text-emerald-600' : l.status === 'rejected' ? 'text-red-600' : 'text-amber-600')}>
                          {l.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
              {employee.notes && (
                <div className="bg-muted/40 rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
                  <p className="text-sm">{employee.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gps" className="mt-0">
              <div className="bg-card rounded-xl border border-border p-4">
                <EmployeeLocationAssignment employee={employee} />
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <div className="bg-card rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Recent Attendance (Last 60 days)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        {['Date', 'In', 'Out', 'Hours', 'OT', 'Late', 'Status'].map(h => (
                          <th key={h} className="pb-2 text-left font-medium pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.length === 0 && (
                        <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No records</td></tr>
                      )}
                      {attendance.map(a => (
                        <tr key={a.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                          <td className="py-2 pr-3 font-medium">{formatDate(a.date)}</td>
                          <td className="py-2 pr-3">{a.check_in || '—'}</td>
                          <td className="py-2 pr-3">{a.check_out || '—'}</td>
                          <td className="py-2 pr-3">{a.working_hours ? `${Number(a.working_hours).toFixed(1)}h` : '—'}</td>
                          <td className="py-2 pr-3">{a.overtime_hours ? `${Number(a.overtime_hours).toFixed(1)}h` : '—'}</td>
                          <td className="py-2 pr-3">{a.late_minutes ? `${a.late_minutes}m` : '—'}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={cn('text-xs capitalize', attColors[a.status] || '')}>
                              {a.status?.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payroll" className="mt-0">
              <div className="bg-card rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Payroll History</p>
                {payrolls.length === 0
                  ? <p className="text-center text-sm text-muted-foreground py-6">No payroll records</p>
                  : (
                    <div className="space-y-2">
                      {payrolls.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                          <div>
                            <p className="text-sm font-semibold">{p.month}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.present_days}d present · {p.late_days}d late · {p.overtime_hours}h OT
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">{formatCurrency(p.net_salary || 0)}</p>
                            <Badge variant="outline" className={cn('text-xs', p.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600')}>
                              {p.payment_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <div className="bg-card rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Assigned Tasks</p>
                {tasks.length === 0
                  ? <p className="text-center text-sm text-muted-foreground py-6">No tasks assigned</p>
                  : (
                    <div className="space-y-2">
                      {tasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{t.due_date ? `Due: ${formatDate(t.due_date)}` : 'No due date'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <Badge variant="outline" className={cn('text-xs capitalize', {
                              high: 'text-red-600', urgent: 'text-red-700', medium: 'text-amber-600', low: 'text-slate-500'
                            }[t.priority] || '')}>
                              {t.priority}
                            </Badge>
                            <Badge variant="outline" className={cn('text-xs capitalize', {
                              done: 'text-emerald-600', in_progress: 'text-blue-600', todo: 'text-slate-500', cancelled: 'text-red-500'
                            }[t.status] || '')}>
                              {t.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}