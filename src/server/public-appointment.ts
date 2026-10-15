import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import type { PublicAppointment } from "@/types/public-appointment";

function anonClient() {
  const { url, anonKey } = supabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isPublicToken(token: string) {
  return /^[A-Za-z0-9_-]{20,80}$/.test(token);
}

export async function lookupPublicAppointment(token: string) {
  if (!isPublicToken(token)) return null;
  const { data, error } = await anonClient().rpc("lookup_public_appointment", { token });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  return data as PublicAppointment;
}

export async function replyPublicAppointment(token: string, reply: "confirmada" | "no_puede") {
  if (!isPublicToken(token)) return { error: "Cita no encontrada" as const };
  const { data, error } = await anonClient().rpc("reply_public_appointment", { token, reply });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return { error: "Cita no encontrada" as const };
  const payload = data as PublicAppointment & { error?: string };
  if (payload.error) return { error: payload.error };
  return { appointment: payload };
}
