import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = () => process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const publishable = () => process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export function isSupabaseConfigured() { return Boolean(url() && publishable()); }

export function userClient(token: string): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error('Supabase server configuration is missing');
  return createClient(url(), publishable(), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}

export function adminClient(): SupabaseClient {
  const secret = process.env.SUPABASE_SECRET_KEY ?? '';
  if (!url() || !secret) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for this operation');
  return createClient(url(), secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticate(token: string): Promise<{ user: User; client: SupabaseClient }> {
  const client = userClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid or expired session');
  return { user: data.user, client };
}

export async function assertArtistAccess(client: SupabaseClient, artistId: string) {
  const { data, error } = await client.from('artists').select('id').eq('id', artistId).maybeSingle();
  if (error || !data) throw new Error('Artist not found or access denied');
}
