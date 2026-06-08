import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/lib/formatters';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
};

function getIconColor(actions) {
  const active = actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  if (active.some(a => a.priority === 'critical')) return 'text-red-500';
  if (active.some(a => a.priority === 'high')) return 'text-orange-500';
  if (active.some(a => a.priority === 'medium')) return 'text-blue-500';
  if (active.some(a => a.priority === 'low')) return 'text-slate-400';
  return 'text-muted-foreground';
}

function shouldPulse(actions) {
  const today = new Date().toISOString().slice(0, 10);
  const active = actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const hasCritical = active.some(a => a.priority === 'critical');
  const hasOverdue = active.some(a => a.due_date && a.due_date < today);
  return hasCritical || hasOverdue;
}

export default function ActionCenterPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: actions = [] } = useQuery({
    queryKey: ['actions'],
    queryFn: () => base44.entities.Action.list('-created_date', 200),
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const unsub = base44.entities.Action.subscribe(() => {});
    return unsub;
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const active = actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const overdue = active.filter(a => a.due_date && a.due_date < today);

  const iconColor = getIconColor(actions);
  const pulse = shouldPulse(actions);
  const count = active.length;

  const grouped = ['critical', 'high', 'medium', 'low'].map(p => ({
    priority: p,
    items: active.filter(a => a.priority === p),
  })).filter(g => g.items.length > 0);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-foreground">
          <Target className={cn('w-4 h-4 transition-colors', iconColor, pulse && 'animate-pulse')} />
          {count > 0 && (
            <span className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white',
              active.some(a => a.priority === 'critical') ? 'bg-red-500' :
              active.some(a => a.priority === 'high') ? 'bg-orange-500' : 'bg-primary'
            )}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[500px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Target className={cn('w-4 h-4', iconColor)} />
            <span className="font-semibold text-sm">Action Center</span>
            {count > 0 && <Badge variant="secondary" className="text-xs h-5">{count} active</Badge>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { navigate('/action-center'); setOpen(false); }}>
            View All <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Overdue Section */}
          {overdue.length > 0 && (
            <div className="border-b border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10 px-4 py-2">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-600">Overdue ({overdue.length})</span>
              </div>
              {overdue.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-red-700 truncate">{a.title}</p>
                    <p className="text-[10px] text-red-500">{formatDate(a.due_date)}</p>
                  </div>
                </div>
              ))}
              {overdue.length > 3 && <p className="text-[10px] text-red-500 mt-1">+{overdue.length - 3} more overdue</p>}
            </div>
          )}

          {grouped.length === 0 && !overdue.length && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Target className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No active actions</p>
            </div>
          )}

          {grouped.map(({ priority, items }) => {
            const cfg = PRIORITY_CONFIG[priority];
            return (
              <div key={priority} className="border-b border-border last:border-0">
                <div className={cn('flex items-center gap-1.5 px-4 py-2', cfg.bg)}>
                  <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                  <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label} ({items.length})</span>
                </div>
                {items.slice(0, 3).map(a => (
                  <div key={a.id} className="px-4 py-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{a.title}</p>
                        {a.due_date && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />Due {formatDate(a.due_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {items.length > 3 && <p className="text-[10px] text-muted-foreground px-4 pb-2">+{items.length - 3} more</p>}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-2 bg-muted/20">
          <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => { navigate('/action-center'); setOpen(false); }}>
            <Target className="w-3.5 h-3.5" />Open Action Center
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}