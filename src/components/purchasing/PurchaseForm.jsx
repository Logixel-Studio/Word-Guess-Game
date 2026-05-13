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

export default function PurchaseForm({ open, onClose, editing, suppliers, purchaseTypes }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const qty = watch('qty') || 0;
  const unitPrice = watch('unit_price') || 0;
  const total = Number(qty) * Number(unitPrice);
  const paymentStatus = watch('payment_status') || 'unpaid';

  useEffect(() => {
    if (editing) {
      reset({
        supplier_id: editing.supplier_id, purchase_type_id: editing.purchase_type_id,
        qty: editing.qty, unit_price: editing.unit_price, description: editing.description,
        payment_status: editing.payment_status || 'unpaid',
        paid_amount: editing.paid_amount || 0,
        due_date: editing.due_date || '',
      });
    } else {
      reset({ supplier_id: '', purchase_type_id: '', qty: '', unit_price: '', description: '', payment_status: 'unpaid', paid_amount: 0, due_date: '' });
    }
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      const pType = purchaseTypes.find(t => t.id === data.purchase_type_id);
      const paidAmt = data.payment_status === 'paid' ? Number(data.qty) * Number(data.unit_price) : Number(data.paid_amount) || 0;
      const payload = {
        ...data,
        supplier_name: supplier?.name || '',
        purchase_type_name: pType?.name || '',
        qty: Number(data.qty),
        unit_price: Number(data.unit_price),
        total: Number(data.qty) * Number(data.unit_price),
        paid_amount: paidAmt,
        due_date: data.due_date || null,
      };
      return editing ? db.Purchase.update(editing.id, payload) : db.Purchase.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success(editing ? 'Updated' : 'Created'); onClose(); }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Purchase' : 'Add New Purchase'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Supplier *</Label>
            <Select value={watch('supplier_id') || ''} onValueChange={v => setValue('supplier_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Purchase Type *</Label>
            <Select value={watch('purchase_type_id') || ''} onValueChange={v => setValue('purchase_type_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select purchase type" /></SelectTrigger>
              <SelectContent>{purchaseTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Qty *</Label><Input type="number" {...register('qty', { required: true })} placeholder="0" /></div>
            <div><Label>Unit Price *</Label><Input type="number" step="0.01" {...register('unit_price', { required: true })} placeholder="0.00" /></div>
            <div><Label>Total</Label><Input value={total.toFixed(2)} readOnly className="bg-muted" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={v => setValue('payment_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(paymentStatus === 'unpaid' || paymentStatus === 'partial') && (
              <div>
                <Label>Due Date</Label>
                <Input type="date" {...register('due_date')} />
              </div>
            )}
          </div>
          {paymentStatus === 'partial' && (
            <div>
              <Label>Paid Amount</Label>
              <Input type="number" step="0.01" {...register('paid_amount')} placeholder="0.00" max={total} />
              <p className="text-xs text-muted-foreground mt-1">Remaining: {(total - (Number(watch('paid_amount')) || 0)).toFixed(2)}</p>
            </div>
          )}
          <div><Label>Description</Label><Textarea {...register('description')} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}