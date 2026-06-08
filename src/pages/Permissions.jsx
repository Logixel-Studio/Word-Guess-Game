import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Search, Plus, LayoutGrid, List } from 'lucide-react';

import { SYSTEM_MODULES, SYSTEM_ROLES, MODULE_CATEGORIES } from '@/lib/permissionsConfig';
import PermissionsSummaryCards from '@/components/permissions/PermissionsSummaryCards';
import ModuleCard from '@/components/permissions/ModuleCard';
import PermissionEditorDialog from '@/components/permissions/PermissionEditorDialog';
import RoleManagerDialog from '@/components/permissions/RoleManagerDialog';
import PermissionChangeLogs from '@/components/permissions/PermissionChangeLogs';

export default function Permissions() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editModule, setEditModule] = useState(null);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('modules');

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const { data: changeLogs = [] } = useQuery({
    queryKey: ['permission-logs'],
    queryFn: () => base44.entities.PermissionChangeLog.list('-created_date', 100),
  });

  // Build a flat lookup: "role__module" -> permissionRecord
  const permissionsMap = {};
  rolePermissions.forEach(p => {
    permissionsMap[`${p.role}__${p.module}`] = p;
  });

  // Combine system + custom roles
  const allRoles = [
    ...SYSTEM_ROLES,
    ...customRoles
      .filter(r => !r.is_archived)
      .map(r => ({ key: r.key, label: r.label, color: r.color || 'text-slate-400', is_system: false })),
  ];

  // Filter modules
  const filteredModules = SYSTEM_MODULES.filter(m => {
    const matchSearch = m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Get last change per module
  const lastChangeByModule = {};
  changeLogs.forEach(log => {
    if (log.module && !lastChangeByModule[log.module]) {
      lastChangeByModule[log.module] = log;
    }
  });

  return (
    <div>
      <PageHeader
        title="Permissions Management"
        description="Manage role-based access control across all system modules"
      >
        <Button variant="outline" className="gap-2" onClick={() => setRoleManagerOpen(true)}>
          <Users className="w-4 h-4" /> Manage Roles
        </Button>
      </PageHeader>

      <PermissionsSummaryCards
        roles={SYSTEM_ROLES}
        customRoles={customRoles}
        modules={SYSTEM_MODULES}
        changeLogs={changeLogs}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="modules">Module Permissions</TabsTrigger>
            <TabsTrigger value="logs">Change Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="modules" className="space-y-4 mt-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search modules..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['All', ...MODULE_CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    categoryFilter === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Module Cards */}
          <div className="space-y-2">
            {filteredModules.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No modules match your search.</div>
            )}
            {filteredModules.map((module, i) => (
              <motion.div
                key={module.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <ModuleCard
                  module={module}
                  allRoles={allRoles}
                  permissionsMap={permissionsMap}
                  lastChange={lastChangeByModule[module.key]}
                  onEdit={setEditModule}
                />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <PermissionChangeLogs logs={changeLogs} />
        </TabsContent>
      </Tabs>

      {/* Permission Editor */}
      <PermissionEditorDialog
        open={!!editModule}
        onClose={() => setEditModule(null)}
        module={editModule}
        allRoles={allRoles}
        permissionsMap={permissionsMap}
      />

      {/* Role Manager */}
      <RoleManagerDialog
        open={roleManagerOpen}
        onClose={() => setRoleManagerOpen(false)}
        customRoles={customRoles}
      />
    </div>
  );
}