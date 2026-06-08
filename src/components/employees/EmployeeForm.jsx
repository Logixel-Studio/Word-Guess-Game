import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const empty = { full_name: '', employee_id: '', email: '', phone: '', role: 'employee', department: '', designation: '', joining_date: '', basic_salary: '', status: 'active', address: '', cnic: '', bank_account: '', shift_start: '09:00', shift_end: '18:00', grace_minutes: 15, overtime_rate: 1.5, notes: '' };

export default function EmployeeForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(employee ? { ...empty, ...employee } : empty);
  }, [employee]);

  const mutation = useMutation({
    mutationFn: () => employee
      ? base44.entities.Employee.update(employee.id, form)
      : base44.entities.Employee.create(form),
    onSuccess: () => { toast.success(employee ? 'Employee updated' : 'Employee added'); onSaved(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
          <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="EMP-001" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="hr_manager">HR Manager</SelectItem>
                <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Department</Label><Input value={form.department} onChange={e => set('department', e.target.value)} /></div>
          <div><Label>Designation</Label><Input value={form.designation} onChange={e => set('designation', e.target.value)} /></div>
          <div><Label>Joining Date</Label><Input type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} /></div>
          <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} /></div>
          <div><Label>Shift Start</Label><Input type="time" value={form.shift_start} onChange={e => set('shift_start', e.target.value)} /></div>
          <div><Label>Shift End</Label><Input type="time" value={form.shift_end} onChange={e => set('shift_end', e.target.value)} /></div>
          <div><Label>Grace Period (minutes)</Label><Input type="number" value={form.grace_minutes} onChange={e => set('grace_minutes', e.target.value)} /></div>
          <div><Label>Overtime Rate (multiplier)</Label><Input type="number" step="0.1" value={form.overtime_rate} onChange={e => set('overtime_rate', e.target.value)} /></div>
          <div><Label>CNIC</Label><Input value={form.cnic} onChange={e => set('cnic', e.target.value)} /></div>
          <div><Label>Bank Account</Label><Input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.full_name}>
            {mutation.isPending ? 'Saving...' : employee ? 'Update' : 'Add Employee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}