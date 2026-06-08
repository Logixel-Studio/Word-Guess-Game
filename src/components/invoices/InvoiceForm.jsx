import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, UserRound, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const emptyItem = { description: '', qty: 1, unit_price: 0, total: 0 };

function generateInvoiceNumber(type, existingInvoices) {
  const prefix = type === 'client' ? 'CLI-INV-' : 'SUP-INV-';
  const relevant = existingInvoices.filter(i => i.invoice_type === type && i.invoice_number?.startsWith(prefix));
  const maxNum = relevant.reduce((max, i) => {
    const num = parseInt(i.invoice_number?.replace(prefix, '') || '0', 10);
    return num > max ? num : max;
  }, 0);
  return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

export default function InvoiceForm({ open, onClose, editing, onSaved }) {
  const currentUser = useCurrentUser();
  const [step, setStep] = useState(editing ? 2 : 1);
  const [invoiceType, setInvoiceType] = useState(editing?.invoice_type || '');
  const [form, setForm] = useState({});
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [linkedIds, setLinkedIds] = useState([]);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list() });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });

  useEffect(() => {
    if (editing) {
      setInvoiceType(editing.invoice_type);
      setStep(2);
      setForm({ ...editing });
      setItems(editing.items?.length ? editing.items : [{ ...emptyItem }]);
      setLinkedIds(editing.linked_record_ids || []);
    } else {
      setStep(1);
      setInvoiceType('');
      setForm({ invoice_date: new Date().toISOString().slice(0, 10), payment_status: 'unpaid', paid_amount: 0 });
      setItems([{ ...emptyItem }]);
      setLinkedIds([]);
    }
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePaymentStatusChange = (status) => {
    if (status === 'paid') {
      setForm(f => ({ ...f, payment_status: 'paid', paid_amount: grandTotal }));
    } else if (status === 'unpaid') {
      setForm(f => ({ ...f, payment_status: 'unpaid', paid_amount: 0 }));
    } else {
      setForm(f => ({ ...f, payment_status: 'partial' }));
    }
  };

  const handleTypeSelect = (type) => {
    setInvoiceType(type);
    const invNum = generateInvoiceNumber(type, allInvoices);
    setForm(f => ({ ...f, invoice_type: type, invoice_number: invNum, invoice_date: new Date().toISOString().slice(0, 10), payment_status: 'unpaid', paid_amount: 0 }));
    setStep(2);
  };

  const handlePartySelect = (id) => {
    const party = invoiceType === 'client' ? clients.find(c => c.id === id) : suppliers.find(s => s.id === id);
    if (!party) return;
    setForm(f => ({
      ...f,
      party_id: id,
      party_name: party.name,
      party_phone: party.phone || '',
      party_address: party.address || '',
      party_email: party.email || '',
    }));
    setLinkedIds([]);
  };

  const filteredRecords = useMemo(() => {
    if (!form.party_id) return [];
    if (invoiceType === 'client') return sales.filter(s => s.client_id === form.party_id);
    return purchases.filter(p => p.supplier_id === form.party_id);
  }, [form.party_id, invoiceType, sales, purchases]);

  const toggleLinked = (id) => {
    const record = filteredRecords.find(r => r.id === id);
    if (!record) return;
    let newIds;
    if (linkedIds.includes(id)) {
      newIds = linkedIds.filter(i => i !== id);
    } else {
      newIds = [...linkedIds, id];
    }
    setLinkedIds(newIds);
    // Auto-populate items from linked records
    const selectedRecords = filteredRecords.filter(r => newIds.includes(r.id));
    const newItems = selectedRecords.map(r => ({
      description: invoiceType === 'client' ? (r.product_name || r.description || 'Item') : (r.purchase_type_name || r.description || 'Item'),
      qty: r.qty || 1,
      unit_price: r.unit_price || 0,
      total: r.total || 0,
    }));
    setItems(newItems.length ? newItems : [{ ...emptyItem }]);
  };

  const updateItem = (i, k, v) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: v };
      if (k === 'qty' || k === 'unit_price') {
        next[i].total = (Number(k === 'qty' ? v : next[i].qty) || 0) * (Number(k === 'unit_price' ? v : next[i].unit_price) || 0);
      }
      return next;
    });
  };

  const subtotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const taxAmt = subtotal * (Number(form.tax_percent) || 0) / 100;
  const discAmt = subtotal * (Number(form.discount_percent) || 0) / 100;
  const grandTotal = subtotal + taxAmt - discAmt;
  const remaining = grandTotal - (Number(form.paid_amount) || 0);
  const payStatus = Number(form.paid_amount) >= grandTotal && grandTotal > 0 ? 'paid' : Number(form.paid_amount) > 0 ? 'partial' : 'unpaid';

  const mutation = useMutation({
    mutationFn: () => {
      const audit = editing ? makeUpdatedBy(currentUser) : { ...makeCreatedBy(currentUser), ...makeUpdatedBy(currentUser) };
      const payload = {
        ...form,
        invoice_type: invoiceType,
        items,
        linked_record_ids: linkedIds,
        subtotal,
        tax_amount: taxAmt,
        discount_amount: discAmt,
        grand_total: grandTotal,
        remaining_amount: remaining,
        payment_status: payStatus,
        ...audit,
      };
      return editing ? base44.entities.Invoice.update(editing.id, payload) : base44.entities.Invoice.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Invoice updated' : 'Invoice created'); onSaved(); onClose(); },
  });

  const parties = invoiceType === 'client' ? clients : suppliers;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Invoice' : step === 1 ? 'Select Invoice Type' : `New ${invoiceType === 'client' ? 'Client' : 'Supplier'} Invoice`}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              {
                type: 'client',
                icon: UserRound,
                title: 'Client Invoice',
                desc: 'Generate invoices for customers and sales records.',
                code: 'CLI-INV-XXXXXX',
                color: 'text-blue-600',
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                border: 'border-blue-200 dark:border-blue-800',
                activeBorder: 'border-blue-500',
                activeGlow: 'shadow-blue-200 dark:shadow-blue-900',
              },
              {
                type: 'supplier',
                icon: Building2,
                title: 'Supplier Invoice',
                desc: 'Generate invoices for suppliers and purchasing records.',
                code: 'SUP-INV-XXXXXX',
                color: 'text-amber-600',
                bg: 'bg-amber-50 dark:bg-amber-950/30',
                border: 'border-amber-200 dark:border-amber-800',
                activeBorder: 'border-amber-500',
                activeGlow: 'shadow-amber-200 dark:shadow-amber-900',
              },
            ].map(({ type, icon: Icon, title, desc, code, color, bg, border, activeBorder, activeGlow }) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeSelect(type)}
                className={cn(
                  'relative border-2 rounded-2xl p-6 text-left transition-all duration-200 group focus:outline-none',
                  'hover:shadow-lg',
                  border,
                  'hover:' + activeBorder,
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', bg)}>
                  <Icon className={cn('w-6 h-6', color)} />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
                <span className={cn('inline-block text-[10px] font-mono px-2 py-0.5 rounded-full', bg, color)}>{code}</span>
                <div className={cn('absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2', activeBorder)} />
              </motion.button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mt-2">
            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice Number</Label><Input value={form.invoice_number || ''} readOnly className="bg-muted" /></div>
              <div>
                <Label>{invoiceType === 'client' ? 'Client' : 'Supplier'} *</Label>
                <Select value={form.party_id || ''} onValueChange={handlePartySelect}>
                  <SelectTrigger><SelectValue placeholder={`Select ${invoiceType}`} /></SelectTrigger>
                  <SelectContent>{parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={form.party_phone || ''} onChange={e => set('party_phone', e.target.value)} /></div>
              <div><Label>Address</Label><Input value={form.party_address || ''} onChange={e => set('party_address', e.target.value)} /></div>
              <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date || ''} onChange={e => set('invoice_date', e.target.value)} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} /></div>
            </div>

            {/* Link Records */}
            {form.party_id && filteredRecords.length > 0 && (
              <div>
                <Label className="mb-2 block">Link {invoiceType === 'client' ? 'Sales' : 'Purchases'} (optional)</Label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto border border-border rounded-lg p-2">
                  {filteredRecords.map(r => (
                    <button key={r.id} onClick={() => toggleLinked(r.id)}
                      className={`text-xs px-2 py-1 rounded-md border transition-all ${linkedIds.includes(r.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>
                      {invoiceType === 'client' ? r.product_name : r.purchase_type_name} — {r.total?.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Invoice Items</Label>
                <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { ...emptyItem }])}>
                  <Plus className="w-3 h-3 mr-1" />Add Row
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium px-1">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-center">Unit Price</span>
                  <span className="col-span-2 text-center">Total</span>
                  <span className="col-span-1" />
                </div>
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <Input className="col-span-5 h-8 text-xs" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" />
                    <Input className="col-span-2 h-8 text-xs text-center" type="number" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                    <Input className="col-span-2 h-8 text-xs text-center" type="number" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                    <div className="col-span-2 text-xs text-center font-medium">{Number(it.total).toLocaleString()}</div>
                    <Button variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-destructive" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} disabled={items.length === 1}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tax %</Label><Input type="number" value={form.tax_percent || ''} onChange={e => set('tax_percent', e.target.value)} placeholder="0" /></div>
              <div><Label>Discount %</Label><Input type="number" value={form.discount_percent || ''} onChange={e => set('discount_percent', e.target.value)} placeholder="0" /></div>
              <div><Label>Account Number</Label><Input value={form.account_number || ''} onChange={e => set('account_number', e.target.value)} /></div>
              <div><Label>IBAN</Label><Input value={form.iban || ''} onChange={e => set('iban', e.target.value)} /></div>
            </div>

            {/* Payment Status */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <Label className="text-sm font-semibold">Payment Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'unpaid', label: 'Unpaid', color: 'border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20' },
                  { val: 'partial', label: 'Partial', color: 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                  { val: 'paid', label: 'Paid', color: 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                ].map(({ val, label, color }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePaymentStatusChange(val)}
                    className={cn(
                      'border-2 rounded-lg py-2 text-xs font-semibold transition-all',
                      payStatus === val ? color : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {payStatus !== 'unpaid' && (
                <div>
                  <Label className="text-xs">{payStatus === 'paid' ? 'Paid Amount (auto-filled)' : 'Amount Received'}</Label>
                  <Input
                    type="number"
                    value={form.paid_amount || ''}
                    onChange={e => {
                      const v = Math.min(Math.max(0, Number(e.target.value)), grandTotal);
                      set('paid_amount', v);
                    }}
                    placeholder="0"
                    className="mt-1"
                    readOnly={payStatus === 'paid'}
                  />
                  {payStatus === 'partial' && Number(form.paid_amount) > grandTotal && (
                    <p className="text-xs text-red-500 mt-1">Amount cannot exceed grand total</p>
                  )}
                </div>
              )}
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()}</span></div>
                {taxAmt > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+{taxAmt.toFixed(2)}</span></div>}
                {discAmt > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{discAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold border-t border-border pt-1"><span>Grand Total</span><span>{grandTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600 text-xs"><span>Paid</span><span>{Number(form.paid_amount || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-red-500 text-xs font-medium"><span>Remaining</span><span>{remaining.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Company Override Fields */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Info Override <span className="font-normal normal-case">(optional — leave blank to use Company Settings)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Company Phone</Label><Input className="h-8 text-xs" value={form.company_phone || ''} onChange={e => set('company_phone', e.target.value)} placeholder="Uses default if empty" /></div>
                <div><Label className="text-xs">Company Email</Label><Input className="h-8 text-xs" value={form.company_email || ''} onChange={e => set('company_email', e.target.value)} placeholder="Uses default if empty" /></div>
                <div><Label className="text-xs">Company Website</Label><Input className="h-8 text-xs" value={form.company_website || ''} onChange={e => set('company_website', e.target.value)} placeholder="Uses default if empty" /></div>
                <div><Label className="text-xs">Company Address</Label><Input className="h-8 text-xs" value={form.company_address || ''} onChange={e => set('company_address', e.target.value)} placeholder="Uses default if empty" /></div>
              </div>
            </div>

            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional notes..." /></div>
            <div><Label>Terms & Conditions</Label><Textarea value={form.terms || ''} onChange={e => set('terms', e.target.value)} rows={2} placeholder="Payment terms, conditions..." /></div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.party_id}>
                {mutation.isPending ? 'Saving...' : editing ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}