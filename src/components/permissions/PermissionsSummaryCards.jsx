import SummaryCard from '@/components/shared/SummaryCard';
import { Shield, Users, Star, Package, Lock, Clock } from 'lucide-react';

export default function PermissionsSummaryCards({ roles, customRoles, modules, changeLogs }) {
  const totalRoles = roles.length + customRoles.filter(r => !r.is_archived).length;
  const activeRoles = roles.filter(r => r.is_system).length + customRoles.filter(r => !r.is_archived).length;
  const customActive = customRoles.filter(r => !r.is_archived).length;
  const restrictedModules = modules.filter(m => ['permissions', 'user_management', 'settings', 'activity_logs'].includes(m.key)).length;
  const recentChanges = changeLogs.slice(0, 10).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <SummaryCard title="Total Roles" value={totalRoles} icon={Users} />
      <SummaryCard title="Active Roles" value={activeRoles} icon={Shield} delay={0.05} />
      <SummaryCard title="Custom Roles" value={customActive} icon={Star} delay={0.1} />
      <SummaryCard title="Total Modules" value={modules.length} icon={Package} delay={0.15} />
      <SummaryCard title="Restricted" value={restrictedModules} icon={Lock} delay={0.2} />
      <SummaryCard title="Recent Changes" value={recentChanges} icon={Clock} delay={0.25} />
    </div>
  );
}