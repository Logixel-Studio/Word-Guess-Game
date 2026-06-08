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

const empty = { employee_id: '', employee_name: '', date: new Date().toISOString().slice(0, 10), check_in: '', check_out: '', status: 'present', working_hours: '', overtime_hours: 0, late_minutes: 0, notes: '' };

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return mins > 0 ? (mins / 60).toFixed(2) : '';
}

export default function AttendanceForm({ record, employees, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(record ? { ...empty, ...record } : empty);
  }, [record]);

  const handleEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(f => ({ ...f, employee_id: id, employee_name: emp?.full_name || '' }));
  };

  const handleTimeChange = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      const hours = calcHours(updated.check_in, updated.check_out);
      if (hours) updated.working_hours = hours;
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: () => record
      ? base44.entities.Attendance.update(record.id, form)
      : base44.entities.Attendance.create(form),
    onSuccess: () => { toast.success('Attendance saved'); onSaved(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{record ? 'Edit Attendance' : 'Add Attendance'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={handleEmployee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Check In</Label><Input type="time" value={form.check_in} onChange={e => handleTimeChange('check_in', e.target.value)} /></div>
          <div><Label>Check Out</Label><Input type="time" value={form.check_out} onChange={e => handleTimeChange('check_out', e.target.value)} /></div>
          <div><Label>Working Hours</Label><Input type="number" step="0.1" value={form.working_hours} onChange={e => set('working_hours', e.target.value)} /></div>
          <div><Label>Overtime Hours</Label><Input type="number" step="0.1" value={form.overtime_hours} onChange={e => set('overtime_hours', e.target.value)} /></div>
          <div><Label>Late Minutes</Label><Input type="number" value={form.late_minutes} onChange={e => set('late_minutes', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employee_id}>
            {mutation.isPending ? 'Saving...' : record ? 'Update' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}