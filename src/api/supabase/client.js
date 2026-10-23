import { createClient } from '@supabase/supabase-js';
import { config } from '../../config.js';

if (!config.hasSupabase) {
  throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// The publishable/anon key is safe in the browser. The service-role key and the
// database password must never be exposed to this bundle.
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'purana-bazaar-auth',
  },
  db: {
    schema: 'public',
  },
});
