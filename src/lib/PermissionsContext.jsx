import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

const PermissionsContext = createContext(null);

/**
 * Fetches ALL RolePermission records (now readable by all roles via open RLS read).
 * Filters to the current user's role and exposes per-module permission checks.
 * Super Admin always bypasses all checks.
 * 
 * Fallback logic:
 *   - If the role has NO records configured at all → allow everything (unmanaged role)
 *   - If the role HAS records configured → strictly enforce them (deny if module not granted)
 */
export function PermissionsProvider({ children }) {
  const user = useCurrentUser();
  const role = user?.role || 'employee';
  const isSuperAdmin = role === 'super_admin';

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.list(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Build a lookup for the current role: module -> permission object
  const { permMap, roleIsManaged } = useMemo(() => {
    const map = {};
    let hasAnyRecord = false;

    rolePermissions.forEach(p => {
      if (p.role === role) {
        map[p.module] = p;
        hasAnyRecord = true;
      }
    });

    return { permMap: map, roleIsManaged: hasAnyRecord };
  }, [rolePermissions, role]);

  /**
   * Check if current user can perform an action on a module.
   * action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'print' | 'assign' | 'manage'
   */
  const can = (module, action) => {
    // Super Admin always has full access
    if (isSuperAdmin) return true;

    // If the role has no permissions configured at all, allow everything (backwards compat)
    if (!roleIsManaged) return true;

    const perm = permMap[module];

    // Role is managed but this specific module has no record → deny by default
    if (!perm) return false;

    // full_access overrides everything
    if (perm.full_access) return true;

    return !!perm[`can_${action}`];
  };

  const canRead   = (module) => can(module, 'read');
  const canCreate = (module) => can(module, 'create');
  const canUpdate = (module) => can(module, 'update');
  const canDelete = (module) => can(module, 'delete');
  const canApprove = (module) => can(module, 'approve');
  const canExport  = (module) => can(module, 'export');

  return (
    <PermissionsContext.Provider value={{
      can, canRead, canCreate, canUpdate, canDelete, canApprove, canExport,
      role, isSuperAdmin, permMap, roleIsManaged,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    // Graceful fallback — allow everything if context not mounted
    return {
      can: () => true, canRead: () => true, canCreate: () => true,
      canUpdate: () => true, canDelete: () => true, canApprove: () => true, canExport: () => true,
      role: 'employee', isSuperAdmin: false, permMap: {}, roleIsManaged: false,
    };
  }
  return ctx;
}