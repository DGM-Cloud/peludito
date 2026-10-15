import { createClient } from "@supabase/supabase-js";
import { supabaseServiceEnv } from "@/lib/env";

/** Cliente con service role — solo en servidor para alta de equipo. */
export function createAdminSupabase() {
  const { url, serviceRoleKey } = supabaseServiceEnv();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
