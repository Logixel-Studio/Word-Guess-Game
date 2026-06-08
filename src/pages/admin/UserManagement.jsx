import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/roleConfig';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import SummaryCard from '@/components/shared/SummaryCard';
import UserExpandedRow from '@/components/admin/UserExpandedRow';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EditUserDialog from '@/components/admin/EditUserDialog';

// Roles that should auto-create an employee profile
const STAFF_ROLES = ['employee', 'manager', 'hr_manager', 'accountant', 'inventory_manager', 'sales_manager'];

export default function UserManagement() {
  const qc = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createEmployee = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const deleteUser = useMutation({
    mutationFn: async (user) => {
      // Delete linked employee profile if exists
      const linked = employees.find(e => e.email === user.email);
      if (linked) await base44.entities.Employee.delete(linked.id);
      return base44.entities.User.delete(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('User deleted');
      setDeletingUser(null);
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: async (_, { id, role }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
      if (STAFF_ROLES.includes(role)) {
        const user = users.find(u => u.id === id);
        if (!user) return;
        const alreadyExists = employees.find(e => e.email === user.email || e.full_name === user.full_name);
        if (!alreadyExists) {
          const empId = `EMP-${String(Date.now()).slice(-5)}`;
          await createEmployee.mutateAsync({
            full_name: user.full_name || user.email?.split('@')[0] || 'New Employee',
            email: user.email,
            employee_id: empId,
            role,
            status: 'active',
            notes: 'setup_pending',
          });
          toast.success(`Employee profile created — complete setup in Employees`, { duration: 5000 });
        }
      }
    },
  });

  const roleDistribution = Object.entries(ROLE_LABELS).reduce((acc, [key]) => {
    acc[key] = users.filter(u => u.role === key).length;
    return acc;
  }, {});

  const columns = [
    { key: 'full_name', label: 'Name', render: v => <span className="font-medium text-sm">{v || '—'}</span> },
    { key: 'email', label: 'Email', render: v => <span className="text-sm text-muted-foreground">{v}</span> },
    { key: 'role', label: 'Role', render: (v, row) => (
      <Select value={v || 'user'} onValueChange={role => updateRole.mutate({ id: row.id, role })}>
        <SelectTrigger className="w-40 h-7 text-xs" onClick={e => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>
    )},
    { key: 'created_date', label: 'Joined', render: v => formatDate(v) },
    { key: 'id', label: 'Linked', render: (_, row) => {
      const linked = employees.find(e => e.email === row.email || e.full_name === row.full_name);
      if (!linked) return <span className="text-xs text-muted-foreground">—</span>;
      if (linked.notes === 'setup_pending') return <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">Setup Pending</Badge>;
      return <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">Employee</Badge>;
    }},
  ];

  return (
    <div>
      <PageHeader title="User Management" description="Manage user accounts and roles" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Users" value={users.length} icon={Users} delay={0} />
        <SummaryCard title="Admins" value={(roleDistribution.admin || 0) + (roleDistribution.super_admin || 0)} icon={Shield} delay={0.05} />
        <SummaryCard title="Managers" value={roleDistribution.manager || 0} icon={Users} delay={0.1} />
        <SummaryCard title="Employees" value={roleDistribution.employee || 0} icon={Users} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchKey="full_name"
        expandedContent={(row) => (
          <UserExpandedRow
            user={row}
            onEdit={() => setEditingUser(row)}
            onDelete={() => setDeletingUser(row)}
          />
        )}
      />

      {editingUser && (
        <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
      )}

      <ConfirmDialog
        open={!!deletingUser}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${deletingUser?.full_name || deletingUser?.email}? This will also remove their linked employee profile.`}
        onConfirm={() => deleteUser.mutate(deletingUser)}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}