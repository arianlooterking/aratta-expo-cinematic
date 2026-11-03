/**
 * Public Supabase connection settings. Both values are safe to ship to the
 * browser; row level security in supabase/migrations decides what each
 * signed-in staff member can read or change.
 *
 * NEXT_PUBLIC_* variables are inlined at build time, so they must be read
 * with direct property access.
 */
export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
