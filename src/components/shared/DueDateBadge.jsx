import { getDueDateInfo } from '@/lib/dueDateUtils';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DueDateBadge({ dueDate, paymentStatus }) {
  if (!dueDate || paymentStatus === 'paid') return null;
  const info = getDueDateInfo(dueDate);
  if (!info) return null;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', info.bg, info.color)}>
      <Clock className="w-3 h-3" />
      {info.label}
    </span>
  );
}