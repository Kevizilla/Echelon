import { createBrowserClient } from '@supabase/ssr';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    !!url &&
    url !== 'https://your-project.supabase.co' &&
    !!key &&
    key !== 'your-anon-key-here'
  );
};

export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

  return createBrowserClient(url, key);
}
