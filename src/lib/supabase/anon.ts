import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

/** Anon client for server-side password grant (no persisted session). */
export function getAnonSupabase() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
