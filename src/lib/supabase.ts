// =====================================================================
// Supabase client + demo sign-in. Import `supabase` and `signInDemo`
// from here; don't create a second client anywhere else.
//
// .env.local (never commit it; see .env.example):
//   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=...        (anon / publishable key ONLY)
//   EXPO_PUBLIC_DEMO_EMAIL=demo@calhacks.dev
//   EXPO_PUBLIC_DEMO_PASSWORD=...
//
// Without these the app runs on its local seed data and never calls Supabase.
// =====================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Keep only the origin: the dashboard also shows `…supabase.co/rest/v1/`, and supabase-js adds those paths itself.
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const url = rawUrl?.replace(/^(https?:\/\/[^/]+).*$/, '$1');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** The shared client. Only call this when `isSupabaseConfigured` is true. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!url || !anonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }
  client = createClient(url, anonKey, {
    // Demo app signs in on every launch, so nothing needs to be stored on
    // the phone. Switch persistSession on when there's a real login screen.
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  // Refresh tokens only while the app is in the foreground (Supabase's advice for React Native).
  if (Platform.OS !== 'web') {
    const auth = client.auth;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') auth.startAutoRefresh();
      else auth.stopAutoRefresh();
    });
  }
  return client;
}

/** Call once when the app starts, before loading any data. */
export async function signInDemo(): Promise<string> {
  const supabase = getSupabase();
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session.user.id;

  const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
  if (!email || !password) throw new Error('Missing EXPO_PUBLIC_DEMO_EMAIL / _PASSWORD in .env.local');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Demo sign-in failed: ${error?.message ?? 'no user'}`);
  return data.user.id;
}

/** The signed-in user's id. Every insert needs it (row-level security). */
export async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in yet. Call signInDemo() when the app starts.');
  return id;
}
