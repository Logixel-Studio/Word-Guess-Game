import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ClientForm({ open, onClose, editing }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  useEffect(() => {
    if (editing) {
      reset({ name: editing.name, phone: editing.phone, address: editing.address, description: editing.description, status: editing.status || 'active' });
    } else {
      reset({ name: '', phone: '', address: '', description: '', status: 'active' });
    }
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (data) => editing ? db.Client.update(editing.id, data) : db.Client.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success(editing ? 'Client updated' : 'Client created');
      onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
          <div>
            <Label>Client Name *</Label>
            <Input {...register('name', { required: true })} placeholder="Enter client name" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input {...register('phone')} placeholder="Enter phone number" />
          </div>
          <div>
            <Label>Address</Label>
            <Input {...register('address')} placeholder="Enter address" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={watch('status') || 'active'} onValueChange={v => setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea {...register('description')} placeholder="Notes about this client" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}