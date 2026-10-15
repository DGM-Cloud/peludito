import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/env";

export async function createServerSupabase(): Promise<{
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
    }>;
  };
  from: (table: string) => any;
}> {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // En un Server Component las cookies son de solo lectura.
        }
      },
    },
  });
}
