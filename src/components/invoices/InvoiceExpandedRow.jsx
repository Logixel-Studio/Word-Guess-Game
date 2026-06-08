import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import { useCurrency } from '@/lib/CurrencyContext';
import AuditInfo from '@/components/shared/AuditInfo';
import StatusBadge from '@/components/shared/StatusBadge';
import { Pencil, Trash2, Printer, Download, Eye } from 'lucide-react';
import { printInvoice, downloadInvoicePDF } from './InvoicePDF';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const daysLeft = (due) => {
  if (!due) return null;
  return Math.ceil((new Date(due) - new Date()) / 86400000);
};

export default function InvoiceExpandedRow({ row, onEdit, onDelete, canUpdate, canDelete: canDel, canExport, canPrint, companySettings }) {
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();

  const countMutation = useMutation({
    mutationFn: ({ field }) => base44.entities.Invoice.update(row.id, { [field]: (row[field] || 0) + 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const handlePrint = () => {
    printInvoice(row, companySettings);
    countMutation.mutate({ field: 'print_count' });
    toast.success('Opening print preview...');
  };

  const handleDownload = async () => {
    toast.success('Generating PDF...');
    await downloadInvoicePDF(row, companySettings);
    countMutation.mutate({ field: 'download_count' });
  };

  const handleView = () => {
    printInvoice(row, companySettings);
  };

  const days = daysLeft(row.due_date);
  const isOverdue = days !== null && days < 0 && row.payment_status !== 'paid';

  return (
    <div className="space-y-4 text-sm">
      {/* Party + Invoice Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div><p className="text-xs text-muted-foreground">Invoice #</p><p className="font-mono font-semibold text-primary">{row.invoice_number}</p></div>
        <div><p className="text-xs text-muted-foreground">Type</p>
          <Badge variant="outline" className={row.invoice_type === 'client' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
            {row.invoice_type === 'client' ? 'Client Invoice' : 'Supplier Invoice'}
          </Badge>
        </div>
        <div><p className="text-xs text-muted-foreground">{row.invoice_type === 'client' ? 'Client' : 'Supplier'}</p><p className="font-medium">{row.party_name}</p></div>
        <div><p className="text-xs text-muted-foreground">Phone</p><p>{row.party_phone || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Address</p><p className="truncate">{row.party_address || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Email</p><p>{row.party_email || '—'}</p></div>
        <div><p className="text-xs text-muted-foreground">Invoice Date</p><p>{formatDate(row.invoice_date)}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className={cn(isOverdue ? 'text-red-600 font-medium' : '')}>{formatDate(row.due_date)}
            {days !== null && row.payment_status !== 'paid' && <span className="ml-1 text-xs">{isOverdue ? `(${Math.abs(days)}d overdue)` : `(${days}d left)`}</span>}
          </p>
        </div>
      </div>

      {/* Items Table */}
      {row.items?.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                {['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className={`py-2 px-3 font-semibold text-left ${h !== 'Description' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row.items.map((it, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-2 px-3">{it.description}</td>
                  <td className="py-2 px-3 text-right">{it.qty}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(it.unit_price)}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Financials */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div><p className="text-xs text-muted-foreground">Subtotal</p><p>{formatCurrency(row.subtotal)}</p></div>
        <div><p className="text-xs text-muted-foreground">Tax ({row.tax_percent || 0}%)</p><p>+{formatCurrency(row.tax_amount)}</p></div>
        <div><p className="text-xs text-muted-foreground">Discount ({row.discount_percent || 0}%)</p><p>-{formatCurrency(row.discount_amount)}</p></div>
        <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="font-bold text-base">{formatCurrency(row.grand_total)}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={row.payment_status} />
        </div>
        <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-emerald-600 font-medium">{formatCurrency(row.paid_amount)}</p></div>
        <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-red-600 font-medium">{formatCurrency(row.remaining_amount)}</p></div>
        {row.account_number && <div><p className="text-xs text-muted-foreground">Account #</p><p>{row.account_number}</p></div>}
        {row.iban && <div><p className="text-xs text-muted-foreground">IBAN</p><p className="font-mono text-xs">{row.iban}</p></div>}
        <div><p className="text-xs text-muted-foreground">Downloads / Prints</p><p>{row.download_count || 0} / {row.print_count || 0}</p></div>
      </div>

      {row.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{row.notes}</p></div>}
      {row.terms && <div><p className="text-xs text-muted-foreground">Terms</p><p className="text-sm text-muted-foreground">{row.terms}</p></div>}

      <AuditInfo record={row} />

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
        {canUpdate && <Button variant="outline" size="sm" onClick={() => onEdit(row)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>}
        <Button variant="outline" size="sm" onClick={handleView}><Eye className="w-3 h-3 mr-1" />View Invoice</Button>
        {canPrint && <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-3 h-3 mr-1" />{row.print_count > 0 ? 'Re-Print' : 'Print'}</Button>}
        {canExport && <Button variant="outline" size="sm" onClick={handleDownload}><Download className="w-3 h-3 mr-1" />{row.download_count > 0 ? 'Re-Download' : 'Download PDF'}</Button>}
        {canDel && <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => onDelete(row.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>}
      </div>
    </div>
  );
}