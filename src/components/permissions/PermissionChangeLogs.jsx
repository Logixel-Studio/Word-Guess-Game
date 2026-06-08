import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Clock, Shield, User, Package } from 'lucide-react';

const ACTION_COLORS = {
  granted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
  role_created: 'bg-blue-50 text-blue-700 border-blue-200',
  role_deleted: 'bg-red-50 text-red-700 border-red-200',
  role_renamed: 'bg-amber-50 text-amber-700 border-amber-200',
  role_archived: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function PermissionChangeLogs({ logs }) {
  if (!logs?.length) return (
    <div className="text-center py-12 text-muted-foreground text-sm">No permission changes logged yet.</div>
  );

  return (
    <div className="space-y-2">
      {logs.map((log, i) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow"
        >
          <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 capitalize', ACTION_COLORS[log.action])}>
                {log.action?.replace('_', ' ')}
              </Badge>
              {log.role && (
                <span className="text-xs font-semibold text-foreground">{log.role}</span>
              )}
              {log.module && (
                <>
                  <span className="text-xs text-muted-foreground">on</span>
                  <span className="text-xs font-medium text-foreground">{log.module}</span>
                </>
              )}
            </div>
            {log.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>}
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.changed_by_name || 'Unknown'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(log.created_date)}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}