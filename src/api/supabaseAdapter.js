/**
 * supabaseAdapter.js
 * Drop-in replacement for base44.entities.* and base44.auth.*
 * Maintains identical API surface so all pages/components require zero changes.
 */
import { supabase } from '@/lib/supabase';

// ─── Entity → table name mapping ────────────────────────────────────────────
const TABLE_MAP = {
  Action:               'actions',
  Attendance:           'attendance',
  Client:               'clients',
  CompanySettings:      'company_settings',
  CustomRole:           'custom_roles',
  Employee:             'employees',
  EmployeeLocation:     'employee_locations',
  Expense:              'expenses',
  ExpenseType:          'expense_types',
  Invoice:              'invoices',
  LeaveRequest:         'leave_requests',
  OfficeLocation:       'office_locations',
  Payroll:              'payroll',
  PermissionChangeLog:  'permission_change_logs',
  Product:              'products',
  Purchase:             'purchases',
  PurchaseType:         'purchase_types',
  RolePermission:       'role_permissions',
  Sale:                 'sales',
  Supplier:             'suppliers',
  Task:                 'tasks',
  User:                 'profiles',
};

// ─── Parse base44-style orderBy string ───────────────────────────────────────
// base44 uses '-field' for desc, 'field' for asc
function parseOrder(orderBy) {
  if (!orderBy) return { column: 'created_date', ascending: false };
  const desc = orderBy.startsWith('-');
  const column = desc ? orderBy.slice(1) : orderBy;
  return { column, ascending: !desc };
}

// ─── Entity factory ──────────────────────────────────────────────────────────
function createEntity(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);

  return {
    /** list(orderBy?, limit?) */
    async list(orderBy, limit) {
      const { column, ascending } = parseOrder(orderBy);
      let query = supabase.from(table).select('*').order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    /** filter(filterObj, orderBy?, limit?) */
    async filter(filterObj = {}, orderBy, limit) {
      const { column, ascending } = parseOrder(orderBy);
      let query = supabase.from(table).select('*');
      Object.entries(filterObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query = query.eq(key, value);
      });
      query = query.order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    /** create(data) */
    async create(data) {
      const payload = { ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
      const { data: result, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return result;
    },

    /** update(id, data) */
    async update(id, data) {
      const payload = { ...data, updated_date: new Date().toISOString() };
      const { data: result, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return result;
    },

    /** delete(id) */
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },

    /** subscribe(callback) — Supabase Realtime */
    subscribe(callback) {
      const channel = supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          callback(payload);
        })
        .subscribe();

      // Return unsubscribe function (matches base44 pattern)
      return () => supabase.removeChannel(channel);
    },
  };
}

// ─── Auth adapter ─────────────────────────────────────────────────────────────
let _cachedProfile = null;

export const auth = {
  /** me() — returns user merged with profile */
  async me() {
    if (_cachedProfile) return _cachedProfile;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('Not authenticated');

    // Fetch profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    _cachedProfile = {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      role: profile?.role || 'employee',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
      ...profile,
    };
    return _cachedProfile;
  },

  /** logout(redirectUrl?) */
  async logout(redirectUrl) {
    _cachedProfile = null;
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = '/login';
    }
  },

  /** redirectToLogin(returnUrl?) */
  redirectToLogin(returnUrl) {
    _cachedProfile = null;
    window.location.href = '/login';
  },

  /** updateMe(data) */
  async updateMe(data) {
    _cachedProfile = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update auth metadata if email/password included
    if (data.email || data.password) {
      const authUpdate = {};
      if (data.email) authUpdate.email = data.email;
      if (data.password) authUpdate.password = data.password;
      await supabase.auth.updateUser(authUpdate);
    }

    // Update profile row
    const profileFields = { ...data };
    delete profileFields.password;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...profileFields, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  clearCache() { _cachedProfile = null; },
};

// ─── Storage / integrations adapter ──────────────────────────────────────────
export const integrations = {
  Core: {
    /** UploadFile({ file }) → { file_url } */
    async UploadFile({ file }) {
      const ext = file.name.split('.').pop();
      const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('nutrimeth-files')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('nutrimeth-files')
        .getPublicUrl(fileName);
      return { file_url: publicUrl };
    },
  },
};

// ─── Build entities proxy ─────────────────────────────────────────────────────
export const entities = new Proxy({}, {
  get(_, entityName) {
    return createEntity(entityName);
  },
});

// ─── Main export (drop-in for base44) ─────────────────────────────────────────
export const base44Compat = { entities, auth, integrations };
