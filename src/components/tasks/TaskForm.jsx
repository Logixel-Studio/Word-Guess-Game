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

const empty = { title: '', description: '', assigned_to_id: '', assigned_to_name: '', assigned_by_name: '', priority: 'medium', status: 'todo', due_date: '', department: '', notes: '' };

export default function TaskForm({ task, employees, onClose, onSaved }) {
  const currentUser = useCurrentUser();
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(task ? { ...empty, ...task } : empty);
  }, [task]);

  const handleEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(f => ({ 
      ...f, 
      assigned_to_id: id, 
      assigned_to_name: emp?.full_name || '',
      assigned_to_email: emp?.email || '',
    }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const auditFields = task
        ? makeUpdatedBy(currentUser)
        : { ...makeCreatedBy(currentUser), ...makeUpdatedBy(currentUser) };
      // Automatically fill assigned_by fields from currentUser
      const assignedBy = !task ? {
        assigned_by_name: form.assigned_by_name || currentUser?.full_name || '',
        assigned_by_id: currentUser?.id || '',
        assigned_by_email: currentUser?.email || '',
        assigned_by_role: currentUser?.role || '',
      } : {};
      const payload = { ...form, ...assignedBy, ...auditFields };
      return task
        ? base44.entities.Task.update(task.id, payload)
        : base44.entities.Task.create(payload);
    },
    onSuccess: () => { toast.success(task ? 'Task updated' : 'Task created'); onSaved(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assign To</Label>
              <Select value={form.assigned_to_id} onValueChange={handleEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Assigned By</Label><Input value={form.assigned_by_name} onChange={e => set('assigned_by_name', e.target.value)} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={e => set('department', e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
            {mutation.isPending ? 'Saving...' : task ? 'Update' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}