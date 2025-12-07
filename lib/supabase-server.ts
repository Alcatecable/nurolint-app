import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase server configuration missing. Database operations will not function.');
    return null;
  }

  supabaseServerClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseServerClient;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  return !!(supabaseUrl && supabaseServiceKey);
}
