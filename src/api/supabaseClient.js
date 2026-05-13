import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aassjlvbyirldptytsyn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_gtLYA9DIAKUZjSnA8T_2yw_UfQqx-rD';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Creator context (set at login) ───────────────────────────────────────
let _creatorId = null;
let _creatorName = null;
let _creatorEmail = null;

export function setCreatorContext({ id, name, email }) {
  _creatorId = id || null;
  _creatorName = name || null;
  _creatorEmail = email || null;
}

export function getCreatorContext() {
  return { creator_id: _creatorId, creator_name: _creatorName, creator_email: _creatorEmail };
}

// ─── Generic entity helpers ────────────────────────────────────────────────
function makeEntity(table) {
  return {
    async list(filters = {}) {
      let q = supabase.from(table).select('*').order('created_at', { ascending: false });
      for (const [col, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null && val !== '') q = q.eq(col, val);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalise);
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return normalise(data);
    },

    async create(payload) {
      const clean = stripReadonly(payload);
      // Inject creator fields if not already present
      if (_creatorId && !clean.creator_id) clean.creator_id = _creatorId;
      if (_creatorName && !clean.creator_name) clean.creator_name = _creatorName;
      if (_creatorEmail && !clean.creator_email) clean.creator_email = _creatorEmail;
      const { data, error } = await supabase.from(table).insert([clean]).select().single();
      if (error) throw error;
      return normalise(data);
    },

    async update(id, payload) {
      const clean = stripReadonly(payload);
      const { data, error } = await supabase
        .from(table)
        .update({ ...clean, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalise(data);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
  };
}

function stripReadonly(obj) {
  const copy = { ...obj };
  delete copy.id;
  delete copy.created_at;
  delete copy.created_date;
  return copy;
}

function normalise(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date,
  };
}

// ─── Entity map ───────────────────────────────────────────────────────────
export const db = {
  Client: makeEntity('clients'),
  Supplier: makeEntity('suppliers'),
  Product: makeEntity('products'),
  Sale: makeEntity('sales'),
  Purchase: makeEntity('purchases'),
  Expense: makeEntity('expenses'),
  ExpenseType: makeEntity('expense_types'),
  PurchaseType: makeEntity('purchase_types'),
  CompanySettings: makeEntity('company_settings'),
};

// ─── File upload via Supabase Storage ─────────────────────────────────────
export async function uploadFile(file, bucket = 'uploads') {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
}
