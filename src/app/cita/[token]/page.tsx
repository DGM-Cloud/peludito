import { PublicAppointmentCard } from "@/components/appointments/PublicAppointmentCard";
import { lookupPublicAppointment } from "@/server/public-appointment";
import type { Metadata } from "next";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Tu cita",
  robots: { index: false, follow: false },
};

export default async function PublicAppointmentPage({ params }: Props) {
  const { token } = await params;
  let appointment = null;
  let failed = false;
  try {
    appointment = await lookupPublicAppointment(token);
  } catch {
    failed = true;
  }

  if (!appointment) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f4ee] px-6 text-center text-[#14241f]">
        <div className="max-w-sm rounded-[28px] bg-white px-6 py-8 shadow-[0_28px_70px_-36px_rgba(20,36,31,0.45)] ring-1 ring-[#14241f]/8">
          <p className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight">
            {failed ? "No se pudo abrir la cita" : "Este enlace no corresponde a una cita"}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#24312d]">
            {failed
              ? "Vuelve a intentar en unos minutos o escribe a la clínica."
              : "Pide a la clínica que te envíe de nuevo el mensaje de WhatsApp."}
          </p>
        </div>
      </div>
    );
  }

  return <PublicAppointmentCard token={token} initial={appointment} />;
}
