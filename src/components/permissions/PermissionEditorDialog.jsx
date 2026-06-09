import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PERMISSION_KEYS } from '@/lib/permissionsConfig';
import { toast } from 'sonner';
import { Shield, Check, X } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

function PermCheckbox({ checked, onChange, color }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all duration-150 mx-auto',
        checked
          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background hover:border-primary/50'
      )}
    >
      {checked && <Check className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function PermissionEditorDialog({ open, onClose, module, allRoles, permissionsMap }) {
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const [matrix, setMatrix] = useState({});

  useEffect(() => {
    if (!module) return;
    const initial = {};
    allRoles.forEach(r => {
      const existing = permissionsMap[`${r.key}__${module.key}`] || {};
      initial[r.key] = {
        can_read: existing.can_read ?? false,
        can_create: existing.can_create ?? false,
        can_update: existing.can_update ?? false,
        can_delete: existing.can_delete ?? false,
        can_approve: existing.can_approve ?? false,
        can_export: existing.can_export ?? false,
        can_print: existing.can_print ?? false,
        can_assign: existing.can_assign ?? false,
        can_manage: existing.can_manage ?? false,
        full_access: existing.full_access ?? false,
        id: existing.id || null,
      };
    });
    setMatrix(initial);
  }, [module, allRoles, permissionsMap, open]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const ops = [];
      for (const role of allRoles) {
        const perms = matrix[role.key];
        if (!perms) continue;
        const payload = { role: role.key, module: module.key, ...perms };
        delete payload.id;

        if (perms.id) {
          ops.push(base44.entities.RolePermission.update(perms.id, payload));
        } else {
          ops.push(base44.entities.RolePermission.create(payload));
        }

        // Log changes
        await base44.entities.PermissionChangeLog.create({
          changed_by_id: currentUser?.id,
          changed_by_name: currentUser?.full_name,
          changed_by_email: currentUser?.email,
          role: role.key,
          module: module.key,
          action: 'granted',
          notes: `Permissions updated for ${role.label} on ${module.label}`,
        });
      }
      return Promise.all(ops);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      qc.invalidateQueries({ queryKey: ['permission-logs'] });
      toast.success('Permissions saved successfully');
      onClose();
    },
  });

  const toggle = (roleKey, permKey) => {
    setMatrix(prev => {
      const updated = { ...prev[roleKey], [permKey]: !prev[roleKey][permKey] };
      // Full access toggles everything
      if (permKey === 'full_access' && updated.full_access) {
        PERMISSION_KEYS.forEach(pk => { updated[pk.key] = true; });
      }
      return { ...prev, [roleKey]: updated };
    });
  };

  const toggleRow = (roleKey, val) => {
    setMatrix(prev => {
      const updated = { ...prev[roleKey] };
      PERMISSION_KEYS.forEach(pk => { updated[pk.key] = val; });
      return { ...prev, [roleKey]: updated };
    });
  };

  const toggleCol = (permKey, val) => {
    setMatrix(prev => {
      const updated = { ...prev };
      allRoles.forEach(r => { updated[r.key] = { ...updated[r.key], [permKey]: val }; });
      return updated;
    });
  };

  if (!module) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Edit Permissions — {module.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </DialogHeader>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-semibold py-2 pr-4 w-36">Role</th>
                {PERMISSION_KEYS.map(pk => (
                  <th key={pk.key} className="text-center py-2 px-1 w-16">
                    <div className="space-y-1">
                      <p className={cn('text-xs font-semibold', pk.color)}>{pk.label}</p>
                      <button
                        type="button"
                        onClick={() => toggleCol(pk.key, true)}
                        className="text-[9px] text-muted-foreground hover:text-primary underline block mx-auto"
                      >
                        All
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-20 text-center text-muted-foreground font-semibold py-2 text-xs">Grant All</th>
              </tr>
            </thead>
            <tbody>
              {allRoles.map((role, idx) => {
                const perms = matrix[role.key] || {};
                const allGranted = PERMISSION_KEYS.every(pk => perms[pk.key]);
                return (
                  <tr key={role.key} className={cn('border-b border-border/50', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                    <td className="py-2.5 pr-4">
                      <div>
                        <p className={cn('font-semibold text-xs', role.color)}>{role.label}</p>
                        {role.is_system && (
                          <Badge variant="outline" className="text-[9px] px-1 mt-0.5">System</Badge>
                        )}
                      </div>
                    </td>
                    {PERMISSION_KEYS.map(pk => (
                      <td key={pk.key} className="py-2.5 px-1 text-center">
                        <PermCheckbox
                          checked={!!perms[pk.key]}
                          onChange={() => toggle(role.key, pk.key)}
                        />
                      </td>
                    ))}
                    <td className="py-2.5 px-2 text-center">
                      <Button
                        type="button"
                        variant={allGranted ? 'destructive' : 'outline'}
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => toggleRow(role.key, !allGranted)}
                      >
                        {allGranted ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}