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

export default function SaleForm({ open, onClose, editing, clients, products }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const qty = watch('qty') || 0;
  const unitPrice = watch('unit_price') || 0;
  const total = Number(qty) * Number(unitPrice);
  const paymentStatus = watch('payment_status') || 'unpaid';
  const selectedProduct = products.find(p => p.id === watch('product_id'));

  useEffect(() => {
    if (editing) {
      reset({
        client_id: editing.client_id, product_id: editing.product_id,
        qty: editing.qty, unit_price: editing.unit_price, description: editing.description,
        payment_status: editing.payment_status || 'unpaid',
        paid_amount: editing.paid_amount || 0,
        due_date: editing.due_date || '',
      });
    } else {
      reset({ client_id: '', product_id: '', qty: '', unit_price: '', description: '', payment_status: 'unpaid', paid_amount: 0, due_date: '' });
    }
  }, [editing, open, reset]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const client = clients.find(c => c.id === data.client_id);
      const product = products.find(p => p.id === data.product_id);
      const saleQty = Number(data.qty);
      const salePrice = Number(data.unit_price);
      const costPerUnit = product?.production_cost || 0;
      const paidAmt = data.payment_status === 'paid' ? saleQty * salePrice : Number(data.paid_amount) || 0;

      if (!editing && product && saleQty > (product.stock_qty || 0)) {
        toast.error(`Insufficient stock! Available: ${product.stock_qty || 0}`);
        throw new Error('Insufficient stock');
      }

      const payload = {
        ...data,
        client_name: client?.name || '',
        product_name: product?.name || '',
        qty: saleQty,
        unit_price: salePrice,
        total: saleQty * salePrice,
        cost_per_unit: costPerUnit,
        profit: (salePrice - costPerUnit) * saleQty,
        paid_amount: paidAmt,
        due_date: data.due_date || null,
      };

      if (editing) {
        const qtyDiff = saleQty - (editing.qty || 0);
        if (product && qtyDiff !== 0) {
          const newStock = (product.stock_qty || 0) - qtyDiff;
          if (newStock < 0) { toast.error('Insufficient stock!'); throw new Error('Insufficient stock'); }
          let status = newStock === 0 ? 'out_of_stock' : newStock <= 10 ? 'low_stock' : 'in_stock';
          await db.Product.update(product.id, { stock_qty: newStock, status });
        }
        return db.Sale.update(editing.id, payload);
      } else {
        if (product) {
          const newStock = (product.stock_qty || 0) - saleQty;
          let status = newStock === 0 ? 'out_of_stock' : newStock <= 10 ? 'low_stock' : 'in_stock';
          await db.Product.update(product.id, { stock_qty: newStock, status });
        }
        return db.Sale.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Sale updated' : 'Sale created');
      onClose();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Sale' : 'Add New Sale'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Client *</Label>
            <Select value={watch('client_id') || ''} onValueChange={v => setValue('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product *</Label>
            <Select value={watch('product_id') || ''} onValueChange={v => setValue('product_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock_qty || 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && <p className="text-xs text-muted-foreground mt-1">Available: {selectedProduct.stock_qty || 0} | Cost: {(selectedProduct.production_cost || 0).toFixed(2)}/unit</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Qty *</Label><Input type="number" {...register('qty', { required: true })} placeholder="0" /></div>
            <div><Label>Sell Price *</Label><Input type="number" step="0.01" {...register('unit_price', { required: true })} placeholder="0.00" /></div>
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
              <Label>Received Amount</Label>
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