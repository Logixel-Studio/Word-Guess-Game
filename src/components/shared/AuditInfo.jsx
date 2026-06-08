import { User, Clock } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { ROLE_LABELS } from '@/lib/roleConfig';
import { cn } from '@/lib/utils';

/**
 * Reusable audit trail display: Created By / Updated By
 * Usage: <AuditInfo record={row} />
 */
export default function AuditInfo({ record, className }) {
  const createdByName = record?.created_by_name || record?.created_by;
  const createdByRole = record?.created_by_role;
  const createdDate = record?.created_date;
  const updatedByName = record?.updated_by_name;
  const updatedByRole = record?.updated_by_role;
  const updatedDate = record?.updated_date;

  if (!createdByName && !createdDate) return null;

  return (
    <div className={cn('flex flex-wrap gap-4 pt-2 border-t border-border/60', className)}>
      {createdByName && (
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Created by{' '}
            <span className="font-medium text-foreground">{createdByName}</span>
            {createdByRole && (
              <span className="text-muted-foreground"> ({ROLE_LABELS[createdByRole] || createdByRole})</span>
            )}
            {createdDate && <span className="text-muted-foreground"> · {formatDate(createdDate)}</span>}
          </span>
        </div>
      )}
      {updatedByName && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Updated by{' '}
            <span className="font-medium text-foreground">{updatedByName}</span>
            {updatedByRole && (
              <span className="text-muted-foreground"> ({ROLE_LABELS[updatedByRole] || updatedByRole})</span>
            )}
            {updatedDate && <span className="text-muted-foreground"> · {formatDate(updatedDate)}</span>}
          </span>
        </div>
      )}
      {!updatedByName && updatedDate && updatedDate !== createdDate && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">Updated {formatDate(updatedDate)}</span>
        </div>
      )}
    </div>
  );
}