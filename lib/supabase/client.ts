import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _browser: SupabaseClient | null = null;
let _server: SupabaseClient | null = null;

// Browser client — uses anon key, respects RLS
export function getSupabaseBrowser(): SupabaseClient {
  if (!_browser) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase browser env vars');
    _browser = createClient(url, key);
  }
  return _browser;
}

// Server client — uses service role key, bypasses RLS for server-side writes
export function getSupabaseServer(): SupabaseClient {
  if (!_server) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase server env vars');
    _server = createClient(url, key);
  }
  return _server;
}

// Re-export for convenience — initialized lazily on first call
export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseBrowser();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseServer();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
