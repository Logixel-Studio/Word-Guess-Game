import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const today = new Date().toISOString().slice(0, 7);

const empty = {
  employee_id: '', employee_name: '', employee_email: '', employee_department: '', employee_role: '',
  month: today,
  basic_salary: 0, overtime_hours: 0, overtime_amount: 0, overtime_pay: 0,
  bonus: 0, bonus_amount: 0,
  deductions: 0, late_deduction: 0, leave_deduction: 0,
  gross_salary: 0, net_salary: 0,
  total_days: 26, present_days: 26, absent_days: 0, late_days: 0, late_minutes: 0,
  payment_status: 'pending', notes: '',
};

function calcSalaries(f) {
  const gross = (Number(f.basic_salary) || 0)
    + (Number(f.overtime_amount) || Number(f.overtime_pay) || 0)
    + (Number(f.bonus_amount) || Number(f.bonus) || 0);
  const net = gross
    - (Number(f.deductions) || 0)
    - (Number(f.late_deduction) || 0)
    - (Number(f.leave_deduction) || 0);
  return { gross_salary: Math.max(0, gross), net_salary: Math.max(0, net) };
}

export default function PayrollForm({ record, employees, onClose, onSaved }) {
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(empty);
  const [autoLoading, setAutoLoading] = useState(false);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (['basic_salary','overtime_amount','overtime_pay','bonus','bonus_amount','deductions','late_deduction','leave_deduction'].includes(k)) {
      Object.assign(updated, calcSalaries(updated));
    }
    return updated;
  });

  useEffect(() => {
    if (record) setForm({ ...empty, ...record });
    else setForm(empty);
  }, [record]);

  const handleEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    setForm(f => {
      const updated = {
        ...f,
        employee_id: id,
        employee_name: emp.full_name || '',
        employee_email: emp.email || '',
        employee_department: emp.department || '',
        employee_role: emp.role || '',
        basic_salary: emp.basic_salary || 0,
      };
      Object.assign(updated, calcSalaries(updated));
      return updated;
    });
  };

  // Auto-fill attendance & leave data
  const autoFillFromData = async () => {
    if (!form.employee_id || !form.month) return;
    setAutoLoading(true);
    try {
      const [year, month] = form.month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(endDay).padStart(2, '0')}`;

      // Fetch attendance for this employee & month
      const attendance = await base44.entities.Attendance.filter({ employee_id: form.employee_id });
      const monthAtt = attendance.filter(a => a.date >= startDate && a.date <= endDate);

      const presentDays = monthAtt.filter(a => a.status === 'present' || a.status === 'late').length;
      const lateDays = monthAtt.filter(a => a.status === 'late').length;
      const lateMinutes = monthAtt.reduce((s, a) => s + (a.late_minutes || 0), 0);
      const overtimeHours = monthAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0);
      const totalDays = endDay;
      const absentDays = totalDays - presentDays - monthAtt.filter(a => a.status === 'on_leave').length;

      // Fetch approved leaves for this month
      const leaves = await base44.entities.LeaveRequest.filter({ employee_id: form.employee_id });
      const monthLeaves = leaves.filter(l =>
        l.status === 'approved' && l.from_date >= startDate && l.from_date <= endDate
      );
      const unpaidLeaveDays = monthLeaves
        .filter(l => l.leave_type === 'unpaid')
        .reduce((s, l) => s + (l.days || 1), 0);

      // Calculate deductions
      const emp = employees.find(e => e.id === form.employee_id);
      const dailyRate = (emp?.basic_salary || form.basic_salary || 0) / totalDays;
      const lateDeduction = lateDays * (dailyRate * 0.5); // 0.5 day per late
      const leaveDeduction = unpaidLeaveDays * dailyRate;
      const overtimeRate = emp?.overtime_rate || 1.5;
      const hourlyRate = (emp?.basic_salary || form.basic_salary || 0) / (totalDays * 8);
      const overtimeAmount = overtimeHours * hourlyRate * overtimeRate;

      setForm(f => {
        const updated = {
          ...f,
          total_days: totalDays,
          present_days: presentDays,
          absent_days: Math.max(0, absentDays),
          late_days: lateDays,
          late_minutes: lateMinutes,
          overtime_hours: parseFloat(overtimeHours.toFixed(2)),
          overtime_amount: parseFloat(overtimeAmount.toFixed(2)),
          overtime_pay: parseFloat(overtimeAmount.toFixed(2)),
          late_deduction: parseFloat(lateDeduction.toFixed(2)),
          leave_deduction: parseFloat(leaveDeduction.toFixed(2)),
        };
        Object.assign(updated, calcSalaries(updated));
        return updated;
      });
      toast.success(`Auto-filled from ${monthAtt.length} attendance records${unpaidLeaveDays > 0 ? ` + ${unpaidLeaveDays} unpaid leave day(s)` : ''}`);
    } catch (e) {
      toast.error('Could not auto-fill attendance data');
    }
    setAutoLoading(false);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        bonus_amount: form.bonus_amount || form.bonus || 0,
        overtime_amount: form.overtime_amount || form.overtime_pay || 0,
        created_by_id: currentUser?.id,
        created_by_name: currentUser?.full_name,
        created_by_email: currentUser?.email,
      };
      return record
        ? base44.entities.Payroll.update(record.id, payload)
        : base44.entities.Payroll.create(payload);
    },
    onSuccess: () => { toast.success('Payroll saved'); onSaved(); },
  });

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const selectedEmp = employees.find(e => e.id === form.employee_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? 'Edit Payroll' : 'Generate Payroll'}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Employee & Month */}
          <div className="sm:col-span-2">
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={handleEmployee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} {e.department ? `— ${e.department}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedEmp && (
            <div className="sm:col-span-2 bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground flex gap-4 flex-wrap">
              <span>Dept: <strong>{selectedEmp.department || '—'}</strong></span>
              <span>Role: <strong>{selectedEmp.role || '—'}</strong></span>
              <span>Email: <strong>{selectedEmp.email || '—'}</strong></span>
              <span>Basic: <strong>{(selectedEmp.basic_salary || 0).toLocaleString()}</strong></span>
            </div>
          )}

          <div>
            <Label>Month *</Label>
            <Select value={form.month} onValueChange={v => set('month', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Status</Label>
            <Select value={form.payment_status} onValueChange={v => set('payment_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-fill button */}
          {form.employee_id && (
            <div className="sm:col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={autoFillFromData} disabled={autoLoading} className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5">
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${autoLoading ? 'animate-spin' : ''}`} />
                {autoLoading ? 'Loading attendance & leave data...' : 'Auto-fill from Attendance & Leave Records'}
              </Button>
            </div>
          )}

          {/* Attendance Summary */}
          <div className="sm:col-span-2 grid grid-cols-5 gap-2">
            {[
              { label: 'Total Days', key: 'total_days' },
              { label: 'Present', key: 'present_days' },
              { label: 'Absent', key: 'absent_days' },
              { label: 'Late Days', key: 'late_days' },
              { label: 'Late Min', key: 'late_minutes' },
            ].map(({ label, key }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input type="number" className="h-8 text-xs" value={form[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
          </div>

          {/* Salary Fields */}
          <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} /></div>
          <div><Label>Overtime Hours</Label><Input type="number" value={form.overtime_hours} onChange={e => set('overtime_hours', e.target.value)} /></div>
          <div><Label>Overtime Amount</Label><Input type="number" value={form.overtime_amount} onChange={e => set('overtime_amount', e.target.value)} /></div>
          <div><Label>Bonus</Label><Input type="number" value={form.bonus_amount || form.bonus} onChange={e => { set('bonus', e.target.value); set('bonus_amount', e.target.value); }} /></div>
          <div><Label>Late Deduction</Label><Input type="number" value={form.late_deduction} onChange={e => set('late_deduction', e.target.value)} /></div>
          <div><Label>Leave Deduction (Unpaid)</Label><Input type="number" value={form.leave_deduction} onChange={e => set('leave_deduction', e.target.value)} /></div>
          <div><Label>Other Deductions</Label><Input type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} /></div>

          {/* Summary */}
          <div className="sm:col-span-2 bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Salary</span>
              <span className="font-semibold text-emerald-600">{Number(form.gross_salary).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Deductions</span>
              <span className="text-red-500">-{((form.deductions || 0) + (form.late_deduction || 0) + (form.leave_deduction || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2 mt-1">
              <span className="font-semibold">Net Salary</span>
              <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">{Number(form.net_salary).toLocaleString()}</Badge>
            </div>
          </div>

          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employee_id}>
            {mutation.isPending ? 'Saving...' : record ? 'Update Payroll' : 'Generate Payroll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}