import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  unpaid: 'bg-red-500/10 text-red-600 border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  in_stock: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  low_stock: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  out_of_stock: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusLabels = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partial: 'Partial',
  active: 'Active',
  inactive: 'Inactive',
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export default function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', statusStyles[status] || '')}>
      {statusLabels[status] || status}
    </Badge>
  );
}