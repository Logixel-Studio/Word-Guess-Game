/**
 * base44Client.js — MIGRATED
 * No longer uses @base44/sdk.
 * Re-exports the Supabase-backed adapter under the same `base44` name
 * so all existing imports work without changes.
 */
export { base44Compat as base44 } from '@/api/supabaseAdapter';
