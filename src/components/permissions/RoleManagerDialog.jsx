import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SYSTEM_ROLES } from '@/lib/permissionsConfig';
import { toast } from 'sonner';
import { Plus, Archive, Trash2, Copy, Pencil, Check, X, Users, Lock } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useCurrentUser } from '@/lib/useCurrentUser';

const COLOR_OPTIONS = [
  'text-primary', 'text-purple-500', 'text-blue-500', 'text-pink-500',
  'text-emerald-500', 'text-amber-500', 'text-cyan-500', 'text-orange-500',
  'text-red-500', 'text-slate-400',
];

export default function RoleManagerDialog({ open, onClose, customRoles }) {
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ key: '', label: '', description: '', color: 'text-primary' });

  const resetForm = () => { setForm({ key: '', label: '', description: '', color: 'text-primary' }); setCreating(false); setEditing(null); };

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.CustomRole.create({ ...data, is_system: false, is_archived: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Role created'); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomRole.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Role updated'); resetForm(); },
  });

  const archiveMut = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.update(id, { is_archived: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Role archived'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Role deleted'); setDeleteId(null); },
  });

  const duplicateMut = useMutation({
    mutationFn: (role) => base44.entities.CustomRole.create({
      key: `${role.key}_copy`,
      label: `${role.label} (Copy)`,
      description: role.description,
      color: role.color,
      is_system: false,
      is_archived: false,
      based_on: role.key,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Role duplicated'); },
  });

  const handleSubmit = () => {
    if (!form.key || !form.label) { toast.error('Key and Label are required'); return; }
    const keyFormatted = form.key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (editing) {
      updateMut.mutate({ id: editing.id, data: { ...form, key: keyFormatted } });
    } else {
      createMut.mutate({ ...form, key: keyFormatted });
    }
  };

  const startEdit = (role) => { setEditing(role); setForm({ key: role.key, label: role.label, description: role.description || '', color: role.color || 'text-primary' }); setCreating(true); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Role Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* System Roles */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">System Roles</p>
            <div className="space-y-1">
              {SYSTEM_ROLES.map(r => (
                <div key={r.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cn('text-sm font-semibold', r.color)}>{r.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1">Built-in</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{r.key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Roles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Roles</p>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { resetForm(); setCreating(true); }}>
                <Plus className="w-3 h-3" /> New Role
              </Button>
            </div>

            {/* Create/Edit Form */}
            {creating && (
              <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-3 mb-3">
                <p className="text-xs font-semibold text-primary">{editing ? 'Edit Role' : 'Create New Role'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Role Key *</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. warehouse_supervisor" value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Label *</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. Warehouse Supervisor" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input className="h-8 text-xs" placeholder="What does this role do?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                        className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold', c,
                          form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                        )}>A</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={resetForm}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                    {editing ? 'Save' : 'Create'}
                  </Button>
                </div>
              </div>
            )}

            {customRoles.length === 0 && !creating && (
              <p className="text-sm text-muted-foreground text-center py-4">No custom roles yet. Create one above.</p>
            )}
            <div className="space-y-1">
              {customRoles.map(r => (
                <div key={r.id} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border border-border', r.is_archived && 'opacity-50')}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold', r.color || 'text-foreground')}>{r.label}</span>
                      {r.is_archived && <Badge variant="outline" className="text-[9px] px-1 text-muted-foreground">Archived</Badge>}
                      {r.based_on && <Badge variant="outline" className="text-[9px] px-1 text-blue-500">Copy</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{r.key}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMut.mutate(r)} title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
                    {!r.is_archived && <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" onClick={() => archiveMut.mutate(r.id)} title="Archive"><Archive className="w-3.5 h-3.5" /></Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete Role"
        description="This will permanently delete the custom role. This action cannot be undone."
      />
    </Dialog>
  );
}