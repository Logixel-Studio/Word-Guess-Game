import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { makeCreatedBy, makeUpdatedBy } from '@/lib/auditUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ActionForm({ open, onClose, editing, onSaved }) {
  const currentUser = useCurrentUser();
  const [form, setForm] = useState({});

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
    } else {
      setForm({ priority: 'medium', status: 'pending' });
    }
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const audit = editing ? makeUpdatedBy(currentUser) : { ...makeCreatedBy(currentUser), ...makeUpdatedBy(currentUser) };
      const payload = { ...form, ...audit };
      return editing ? base44.entities.Action.update(editing.id, payload) : base44.entities.Action.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Action updated' : 'Action created'); onSaved(); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Action' : 'New Action'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Call Supplier, Follow Up Client..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority || 'medium'} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || 'pending'} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div>
              <Label>Reminder Date</Label>
              <Input type="date" value={form.reminder_date || ''} onChange={e => set('reminder_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Optional Links</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Client</Label>
                <Select value={form.linked_client_id || 'none'} onValueChange={v => {
                  if (v === 'none') { set('linked_client_id', ''); set('linked_client_name', ''); return; }
                  const c = clients.find(x => x.id === v);
                  set('linked_client_id', v); set('linked_client_name', c?.name || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Supplier</Label>
                <Select value={form.linked_supplier_id || 'none'} onValueChange={v => {
                  if (v === 'none') { set('linked_supplier_id', ''); set('linked_supplier_name', ''); return; }
                  const s = suppliers.find(x => x.id === v);
                  set('linked_supplier_id', v); set('linked_supplier_name', s?.name || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Invoice</Label>
                <Select value={form.linked_invoice_id || 'none'} onValueChange={v => {
                  if (v === 'none') { set('linked_invoice_id', ''); set('linked_invoice_number', ''); return; }
                  const inv = invoices.find(x => x.id === v);
                  set('linked_invoice_id', v); set('linked_invoice_number', inv?.invoice_number || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Employee</Label>
                <Select value={form.linked_employee_id || 'none'} onValueChange={v => {
                  if (v === 'none') { set('linked_employee_id', ''); set('linked_employee_name', ''); return; }
                  const emp = employees.find(x => x.id === v);
                  set('linked_employee_id', v); set('linked_employee_name', emp?.full_name || '');
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
              {mutation.isPending ? 'Saving...' : editing ? 'Update Action' : 'Create Action'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}