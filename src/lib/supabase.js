import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT')) {
  console.error(
    '⚠️  NUTRIMETH: Supabase not configured.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local\n' +
    'Get values from: https://supabase.com/dashboard → Settings → API'
  );
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession:       true,
      autoRefreshToken:     true,
      detectSessionInUrl:   true,
      // Prevent aggressive token refresh retries on network errors
      flowType:             'pkce',
    },
    global: {
      // 10 second timeout on all requests
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timer));
      },
    },
  }
);
