// Supabase clients for the AI Concierge app.
//
// Two separate clients on purpose:
//   - getSupabaseAdmin(): server-only, uses the SERVICE ROLE key. Bypasses RLS.
//     Use ONLY in API route handlers (app/api/**). NEVER import from a client
//     component — the service role key would leak to the browser bundle.
//   - getSupabaseClient(): browser-safe, uses the public ANON key. Used by the
//     dashboard for Realtime subscriptions and read queries.
//
// Both honor RLS policies for the anon role; the admin client bypasses them.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;
let _client: SupabaseClient | null = null;

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Server-side Supabase client with the service role key.
 * Bypasses Row Level Security. Use inside `app/api/**` only.
 *
 * Throws a friendly error if the URL or service role key are missing —
 * the caller should catch and return a 500 with the message.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url) {
    throw new Error(
      'Supabase not configured: NEXT_PUBLIC_SUPABASE_URL is missing. ' +
        'Add it to .env.local (local) and Vercel env vars (production).',
    );
  }
  if (!serviceKey) {
    throw new Error(
      'Supabase not configured: SUPABASE_SERVICE_ROLE_KEY is missing. ' +
        'Grab it from Supabase Dashboard → Project Settings → API → service_role key.',
    );
  }
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * Browser-safe Supabase client. Reads only the public anon key.
 *
 * Returns `null` when env vars are missing so the UI can degrade gracefully
 * (e.g. show "Offline" instead of crashing). Server routes should use
 * getSupabaseAdmin() instead.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — Realtime disabled.',
      );
    }
    return null;
  }
  _client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _client;
}
