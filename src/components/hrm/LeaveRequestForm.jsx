import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { makeCreatedBy, makeUpdatedBy } from '@/lib/auditUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const empty = { employee_id: '', employee_name: '', leave_type: 'casual', from_date: '', to_date: '', days: 1, reason: '', status: 'pending', reviewed_by: '', review_notes: '' };

function calcDays(from, to) {
  if (!from || !to) return 1;
  const diff = Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

export default function LeaveRequestForm({ record, employees, onClose, onSaved }) {
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(record ? { ...empty, ...record } : empty);
  }, [record]);

  const handleDate = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      updated.days = calcDays(updated.from_date, updated.to_date);
      return updated;
    });
  };

  const handleEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(f => ({ ...f, employee_id: id, employee_name: emp?.full_name || '' }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const auditFields = record
        ? makeUpdatedBy(currentUser)
        : { ...makeCreatedBy(currentUser), ...makeUpdatedBy(currentUser) };
      const payload = { ...form, ...auditFields };
      return record
        ? base44.entities.LeaveRequest.update(record.id, payload)
        : base44.entities.LeaveRequest.create(payload);
    },
    onSuccess: () => { toast.success('Leave request saved'); onSaved(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{record ? 'Edit Leave Request' : 'New Leave Request'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={handleEmployee}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={v => set('leave_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>From Date *</Label><Input type="date" value={form.from_date} onChange={e => handleDate('from_date', e.target.value)} /></div>
            <div><Label>To Date *</Label><Input type="date" value={form.to_date} onChange={e => handleDate('to_date', e.target.value)} /></div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Total Days</span>
            <span className="font-bold">{form.days}</span>
          </div>
          <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} /></div>
          <div><Label>Review Notes</Label><Textarea value={form.review_notes} onChange={e => set('review_notes', e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employee_id || !form.from_date}>
            {mutation.isPending ? 'Saving...' : record ? 'Update' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}