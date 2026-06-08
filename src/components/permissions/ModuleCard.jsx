import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Pencil, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PERMISSION_KEYS } from '@/lib/permissionsConfig';
import { formatDate } from '@/lib/formatters';

const CATEGORY_COLORS = {
  Core: 'bg-primary/10 text-primary border-primary/20',
  Sales: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  Finance: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  Purchasing: 'bg-amber-500/10 text-amber-600 border-amber-200',
  Inventory: 'bg-orange-500/10 text-orange-600 border-orange-200',
  HRM: 'bg-pink-500/10 text-pink-600 border-pink-200',
  Operations: 'bg-blue-500/10 text-blue-600 border-blue-200',
  System: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

export default function ModuleCard({ module, allRoles, permissionsMap, lastChange, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  // Count roles with at least read access
  const accessibleRoles = allRoles.filter(r => {
    const perm = permissionsMap[`${r.key}__${module.key}`];
    return perm?.can_read || perm?.full_access;
  });

  const isRestricted = ['permissions', 'user_management', 'settings', 'activity_logs'].includes(module.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            {isRestricted ? <Lock className="w-4 h-4 text-purple-500" /> : <Shield className="w-4 h-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-foreground">{module.label}</p>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[module.category] || '')}>
                {module.category}
              </Badge>
              {isRestricted && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-600 border-purple-200 bg-purple-50">
                  Restricted
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{module.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {accessibleRoles.length} role{accessibleRoles.length !== 1 ? 's' : ''} with access
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); onEdit(module); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')} />
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 space-y-4 bg-background/50">
              {/* Role access chips */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Roles with Access</p>
                <div className="flex flex-wrap gap-1.5">
                  {allRoles.map(r => {
                    const perm = permissionsMap[`${r.key}__${module.key}`];
                    const hasAccess = perm?.can_read || perm?.full_access;
                    return (
                      <Badge
                        key={r.key}
                        variant="outline"
                        className={cn(
                          'text-xs',
                          hasAccess
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border opacity-50'
                        )}
                      >
                        {hasAccess && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {r.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Mini permission matrix */}
              <div className="overflow-x-auto">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Permission Matrix</p>
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left text-muted-foreground font-medium py-1 pr-3 w-32">Role</th>
                      {PERMISSION_KEYS.map(pk => (
                        <th key={pk.key} className="text-center text-muted-foreground font-medium py-1 px-1 w-10" title={pk.label}>
                          {pk.short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRoles.map(r => {
                      const perm = permissionsMap[`${r.key}__${module.key}`] || {};
                      return (
                        <tr key={r.key} className="border-t border-border/50">
                          <td className={cn('py-1.5 pr-3 font-medium', r.color)}>{r.label}</td>
                          {PERMISSION_KEYS.map(pk => (
                            <td key={pk.key} className="text-center py-1.5 px-1">
                              {perm[pk.key] || perm.full_access
                                ? <span className="text-emerald-500">✓</span>
                                : <span className="text-muted-foreground/30">—</span>
                              }
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Last change */}
              {lastChange && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                  <span>Last updated by <strong>{lastChange.changed_by_name || 'Unknown'}</strong> on {formatDate(lastChange.created_date)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}