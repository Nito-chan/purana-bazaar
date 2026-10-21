export const config = Object.freeze({
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  isDev: import.meta.env.DEV,
});
