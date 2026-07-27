import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

let serviceClient: SupabaseClient | null = null;

/** Service-role client — server only. Bypasses RLS for lesson writes / seed ops. */
export function getServiceSupabase(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const { url, serviceRoleKey } = getSupabaseConfig();
  serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return serviceClient;
}
