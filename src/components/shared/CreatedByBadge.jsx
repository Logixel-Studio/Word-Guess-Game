import { UserCircle, Mail, Calendar, Clock } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

export default function CreatedByBadge({ row }) {
  if (!row) return null;
  const hasCreator = row.creator_name || row.creator_email;
  if (!hasCreator && !row.created_at && !row.updated_at) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Record Info</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {row.creator_name && (
          <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5">
            <UserCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Created By</p>
              <p className="text-xs font-semibold text-foreground truncate">{row.creator_name}</p>
            </div>
          </div>
        )}
        {row.creator_email && (
          <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5">
            <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Creator Email</p>
              <p className="text-xs font-semibold text-foreground truncate">{row.creator_email}</p>
            </div>
          </div>
        )}
        {row.created_at && (
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Created At</p>
              <p className="text-xs font-medium text-foreground truncate">{formatDate(row.created_at)}</p>
            </div>
          </div>
        )}
        {row.updated_at && (
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Updated At</p>
              <p className="text-xs font-medium text-foreground truncate">{formatDate(row.updated_at)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
