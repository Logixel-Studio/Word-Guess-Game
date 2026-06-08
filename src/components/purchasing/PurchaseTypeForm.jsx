import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PurchaseTypeForm({ open, onClose, editing }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (editing) reset({ name: editing.name, description: editing.description });
    else reset({ name: '', description: '' });
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.PurchaseType.update(editing.id, data) : base44.entities.PurchaseType.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseTypes'] }); toast.success(editing ? 'Updated' : 'Created'); onClose(); }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Edit Purchase Type' : 'Create Purchase Type'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div><Label>Name *</Label><Input {...register('name', { required: true })} placeholder="Purchase type name" /></div>
          <div><Label>Description</Label><Textarea {...register('description')} placeholder="Description" rows={3} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}