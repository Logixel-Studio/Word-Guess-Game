import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StockUpdateForm({ product, onClose }) {
  const [qty, setQty] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const newQty = Number(qty) || 0;
      let status = 'in_stock';
      if (newQty === 0) status = 'out_of_stock';
      else if (newQty <= 5) status = 'low_stock';
      return base44.entities.Product.update(product.id, { stock_qty: newQty, status });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Stock updated'); onClose(); setQty(''); }
  });

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update Stock — {product?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Current stock: <strong>{product?.stock_qty || 0}</strong></p>
          <div><Label>New Stock Quantity</Label><Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter new quantity" /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Updating...' : 'Update'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}