import { createServerSupabase } from "@/lib/supabase/server";
import type { Clinic, DemoRole } from "@/types/clinic";
import { HttpError } from "@/server/errors";

export type RequestScope = {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  clinicId: string;
  role: DemoRole;
  fullName: string;
  email: string;
  clinic: Clinic;
  /** Fila en veterinarians ligada a este usuario, si existe. */
  veterinarianId: string | null;
};

export async function requireScope(): Promise<RequestScope> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError("No autorizado", 401);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, clinic_id, clinics(id, name, address, phone)")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new HttpError("Perfil no encontrado", 403);

  const clinicRow = Array.isArray(data.clinics) ? data.clinics[0] : data.clinics;
  if (!clinicRow) throw new HttpError("Sede no encontrada", 403);

  let veterinarianId: string | null = null;
  const { data: vetRow, error: vetError } = await supabase
    .from("veterinarians")
    .select("id")
    .eq("clinic_id", data.clinic_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vetError && vetRow?.id) {
    veterinarianId = String(vetRow.id);
  }

  return {
    supabase,
    userId: user.id,
    clinicId: data.clinic_id,
    role: data.role as DemoRole,
    fullName: data.full_name,
    email: data.email,
    clinic: {
      id: clinicRow.id,
      name: clinicRow.name,
      address: clinicRow.address,
      phone: clinicRow.phone,
    },
    veterinarianId,
  };
}
