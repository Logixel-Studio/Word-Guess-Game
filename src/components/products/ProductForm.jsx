import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useCurrency } from '@/lib/CurrencyContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductForm({ open, onClose, editing }) {
  const qc = useQueryClient();
  const { formatCurrency } = useCurrency();
  const { register, handleSubmit, reset } = useForm();
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    if (editing) {
      reset({ name: editing.name, description: editing.description, stock_qty: editing.stock_qty || 0 });
      setMaterials(editing.materials || []);
    } else {
      reset({ name: '', description: '', stock_qty: 0 });
      setMaterials([]);
    }
  }, [editing, open, reset]);

  const addMaterial = () => setMaterials([...materials, { name: '', qty: 0, unit_price: 0, total: 0 }]);

  const updateMaterial = (idx, field, value) => {
    const updated = [...materials];
    updated[idx] = { ...updated[idx], [field]: field === 'name' ? value : Number(value) };
    if (field === 'qty' || field === 'unit_price') {
      updated[idx].total = (updated[idx].qty || 0) * (updated[idx].unit_price || 0);
    }
    setMaterials(updated);
  };

  const removeMaterial = (idx) => setMaterials(materials.filter((_, i) => i !== idx));
  const productionCost = materials.reduce((a, m) => a + (m.total || 0), 0);

  const mutation = useMutation({
    mutationFn: (data) => {
      const stockQty = Number(data.stock_qty) || 0;
      let status = stockQty === 0 ? 'out_of_stock' : stockQty <= 10 ? 'low_stock' : 'in_stock';
      const payload = { ...data, materials, production_cost: productionCost, stock_qty: stockQty, status };
      return editing ? db.Product.update(editing.id, payload) : db.Product.create(payload);
    },
    onSuccess: () => {
      //  qc.invalidateQueries({ queryKey: ['products'] });
     toast.success(editing ? 'Updated' : 'Created'); onClose(); }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Create Product'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Product Name *</Label><Input {...register('name', { required: true })} placeholder="Product name" /></div>
            <div><Label>Initial Stock Quantity</Label><Input type="number" {...register('stock_qty')} placeholder="0" /></div>
          </div>
          <div><Label>Description</Label><Textarea {...register('description')} rows={2} /></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Raw Materials</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="gap-1 h-8 text-xs">
                <Plus className="w-3 h-3" /> Add Material
              </Button>
            </div>

            {materials.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end bg-muted/50 p-3 rounded-lg">
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Material</Label>
                  <Input value={m.name} onChange={e => updateMaterial(i, 'name', e.target.value)} placeholder="Name" className="h-8" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" value={m.qty || ''} onChange={e => updateMaterial(i, 'qty', e.target.value)} className="h-8" />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <Label className="text-xs">Unit Price</Label>
                  <Input type="number" step="0.01" value={m.unit_price || ''} onChange={e => updateMaterial(i, 'unit_price', e.target.value)} className="h-8" />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-xs">Total</Label>
                  <Input value={(m.total || 0).toFixed(2)} readOnly className="bg-muted h-8" />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMaterial(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {materials.length > 0 && (
              <div className="flex justify-end pt-1 border-t border-border">
                <span className="text-sm font-bold">Production Cost: {formatCurrency(productionCost)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}