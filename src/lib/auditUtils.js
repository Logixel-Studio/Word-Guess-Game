/**
 * Utility to build audit fields (created_by / updated_by) from the current user.
 * Usage:
 *   import { makeCreatedBy, makeUpdatedBy } from '@/lib/auditUtils';
 *   const data = { ...formData, ...makeCreatedBy(currentUser) };
 */

export function makeCreatedBy(user) {
  if (!user) return {};
  return {
    created_by_id: user.id,
    created_by_name: user.full_name || user.email,
    created_by_email: user.email,
    created_by_role: user.role,
  };
}

export function makeUpdatedBy(user) {
  if (!user) return {};
  return {
    updated_by_id: user.id,
    updated_by_name: user.full_name || user.email,
    updated_by_email: user.email,
    updated_by_role: user.role,
  };
}