/**
 * supabaseAdapter.js — Drop-in Supabase replacement for base44
 * Resilient: returns [] on 404/400 instead of throwing, so the UI never breaks
 * even if schema hasn't been applied yet.
 */
import { supabase } from '@/lib/supabase';

// ─── Entity → table name ─────────────────────────────────────────────────────
const TABLE_MAP = {
  Action:              'actions',
  Attendance:          'attendance',
  Client:              'clients',
  CompanySettings:     'company_settings',
  CustomRole:          'custom_roles',
  Employee:            'employees',
  EmployeeLocation:    'employee_locations',
  Expense:             'expenses',
  ExpenseType:         'expense_types',
  Invoice:             'invoices',
  LeaveRequest:        'leave_requests',
  OfficeLocation:      'office_locations',
  Payroll:             'payroll',
  PermissionChangeLog: 'permission_change_logs',
  Product:             'products',
  Purchase:            'purchases',
  PurchaseType:        'purchase_types',
  RolePermission:      'role_permissions',
  Sale:                'sales',
  Supplier:            'suppliers',
  Task:                'tasks',
  User:                'profiles',
};

// Columns that exist in each table for safe ordering
// Falls back to 'id' if uncertain
const SAFE_ORDER_COLUMN = 'created_date';

function parseOrder(orderBy) {
  if (!orderBy) return { column: SAFE_ORDER_COLUMN, ascending: false };
  const desc = orderBy.startsWith('-');
  const col  = desc ? orderBy.slice(1) : orderBy;
  return { column: col, ascending: !desc };
}

// Resilient error handler — log but don't crash
function handleError(err, table, op) {
  const status = err?.code || err?.status;
  if (status === '42P01' || String(err?.message).includes('does not exist') ||
      String(err?.message).includes('404') || String(err?.message).includes('400')) {
    console.warn(`[supabase] ${op} on "${table}" failed (table may not exist yet): ${err.message}`);
    return true; // silent
  }
  console.error(`[supabase] ${op} on "${table}":`, err);
  return false;
}

// ─── Entity factory ──────────────────────────────────────────────────────────
function createEntity(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) { console.warn(`Unknown entity: ${entityName}`); return {}; }

  return {
    /** list(orderBy?, limit?) */
    async list(orderBy, limit) {
      try {
        const { column, ascending } = parseOrder(orderBy);
        let q = supabase.from(table).select('*').order(column, { ascending, nullsFirst: false });
        if (limit) q = q.limit(limit);
        const { data, error } = await q;
        if (error) {
          // Try fallback with 'id' ordering if created_date fails
          if (column === SAFE_ORDER_COLUMN) {
            const { data: d2, error: e2 } = await supabase.from(table).select('*').order('id', { ascending: false });
            if (!e2) return d2 || [];
          }
          handleError(error, table, 'list');
          return [];
        }
        return data || [];
      } catch (err) { handleError(err, table, 'list'); return []; }
    },

    /** filter(filterObj, orderBy?, limit?) */
    async filter(filterObj = {}, orderBy, limit) {
      try {
        const { column, ascending } = parseOrder(orderBy);
        let q = supabase.from(table).select('*');
        Object.entries(filterObj).forEach(([k, v]) => {
          if (v !== undefined && v !== null) q = q.eq(k, v);
        });
        q = q.order(column, { ascending, nullsFirst: false });
        if (limit) q = q.limit(limit);
        const { data, error } = await q;
        if (error) {
          if (column === SAFE_ORDER_COLUMN) {
            let q2 = supabase.from(table).select('*');
            Object.entries(filterObj).forEach(([k, v]) => {
              if (v !== undefined && v !== null) q2 = q2.eq(k, v);
            });
            q2 = q2.order('id', { ascending: false });
            if (limit) q2 = q2.limit(limit);
            const { data: d2, error: e2 } = await q2;
            if (!e2) return d2 || [];
          }
          handleError(error, table, 'filter');
          return [];
        }
        return data || [];
      } catch (err) { handleError(err, table, 'filter'); return []; }
    },

    /** create(data) */
    async create(data) {
      const now = new Date().toISOString();
      const payload = { ...data, created_date: now, updated_date: now };
      const { data: result, error } = await supabase.from(table).insert(payload).select().maybeSingle();
      if (error) { handleError(error, table, 'create'); throw error; }
      return result;
    },

    /** update(id, data) */
    async update(id, data) {
      const payload = { ...data, updated_date: new Date().toISOString() };
      const { data: result, error } = await supabase.from(table).update(payload).eq('id', id).select().maybeSingle();
      if (error) { handleError(error, table, 'update'); throw error; }
      return result;
    },

    /** delete(id) */
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) { handleError(error, table, 'delete'); throw error; }
      return { id };
    },

    /** subscribe(callback) → Supabase Realtime */
    subscribe(callback) {
      const channel = supabase
        .channel(`realtime_${table}_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => callback())
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

// ─── Auth adapter ─────────────────────────────────────────────────────────────
let _cachedProfile = null;

export const auth = {
  async me() {
    if (_cachedProfile) return _cachedProfile;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle();

    _cachedProfile = {
      id:         user.id,
      email:      user.email,
      full_name:  profile?.full_name || user.user_metadata?.full_name || '',
      role:       profile?.role      || 'employee',
      avatar_url: profile?.avatar_url || '',
      ...profile,
    };
    return _cachedProfile;
  },

  async logout(redirectUrl) {
    _cachedProfile = null;
    await supabase.auth.signOut();
    window.location.href = '/login';
  },

  redirectToLogin() { _cachedProfile = null; window.location.href = '/login'; },

  async updateMe(data) {
    _cachedProfile = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const profileFields = { ...data }; delete profileFields.password;
    const { data: updated, error } = await supabase
      .from('profiles').update({ ...profileFields, updated_at: new Date().toISOString() })
      .eq('id', user.id).select().maybeSingle();
    if (error) throw error;
    return updated;
  },

  clearCache() { _cachedProfile = null; },
};

// ─── Storage adapter ──────────────────────────────────────────────────────────
export const integrations = {
  Core: {
    async UploadFile({ file }) {
      const ext  = file.name.split('.').pop();
      const path = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('nutrimeth-files').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('nutrimeth-files').getPublicUrl(path);
      return { file_url: publicUrl };
    },
  },
};

// ─── Proxy entities ───────────────────────────────────────────────────────────
export const entities = new Proxy({}, { get(_, name) { return createEntity(name); } });

export const base44Compat = { entities, auth, integrations };
