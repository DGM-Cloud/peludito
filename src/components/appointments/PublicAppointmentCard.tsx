"use client";

import { visitNote } from "@/lib/visit-notes";
import type { PublicAppointment } from "@/types/public-appointment";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatPhone } from "@/utils/formatPhone";
import { useState } from "react";

const speciesLabel: Record<string, string> = {
  perro: "Perro",
  gato: "Gato",
  ave: "Ave",
  conejo: "Conejo",
};

const closedStatuses = new Set([
  "atendida",
  "pagada",
  "cancelada",
  "no_asistio",
  "en_consulta",
  "llego",
]);

function dateLabel(date: string) {
  const formatted = new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function todayIso() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function isPast(date: string) {
  return date.slice(0, 10) < todayIso();
}

function Paw({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.5c1.2 0 2.2.9 2.2 2.1 0 .4-.1.8-.3 1.1 1.5.3 2.6 1.6 2.6 3.2v.4c1.1.5 1.8 1.6 1.8 2.9 0 1.8-1.4 3.2-3.2 3.2h-.4c-.4 1.4-1.7 2.4-3.2 2.4s-2.8-1-3.2-2.4h-.4C6.1 16.4 4.7 15 4.7 13.2c0-1.3.7-2.4 1.8-2.9v-.4c0-1.6 1.1-2.9 2.6-3.2-.2-.3-.3-.7-.3-1.1C8.8 4.4 9.8 3.5 11 3.5h1z" />
    </svg>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-4 border-t border-[#efeae2] py-4 first:border-t-0">
      <dt className="pt-0.5 text-[13px] leading-5 text-[#4d5c56]">{label}</dt>
      <dd className="text-[15px] font-medium leading-6 text-[#14241f]">{children}</dd>
    </div>
  );
}

export function PublicAppointmentCard({
  token,
  initial,
}: {
  token: string;
  initial: PublicAppointment;
}) {
  const [appointment, setAppointment] = useState(initial);
  const [pending, setPending] = useState<"confirmada" | "no_puede" | null>(null);
  const [error, setError] = useState("");

  const past = isPast(appointment.date);
  const closed = past || closedStatuses.has(appointment.status);
  const confirmed = appointment.clientReply === "confirmada" || appointment.status === "confirmada";
  const declined = appointment.clientReply === "no_puede" && appointment.status === "programada";
  const species = speciesLabel[appointment.species] ?? appointment.species;
  const article =
    appointment.species === "gato" ? "una" : species ? "un" : "";
  const breed = appointment.breed?.trim();
  const petLine = breed
    ? `${appointment.petName} es ${article} ${breed}`
    : species
      ? `${appointment.petName} es ${article} ${species.toLowerCase()}`
      : appointment.petName;
  const day = appointment.date.slice(0, 10);
  const occasion =
    day === todayIso() ? "Hoy" : past ? "Cita pasada" : "Próxima visita";

  const reply = async (next: "confirmada" | "no_puede") => {
    setPending(next);
    setError("");
    try {
      const response = await fetch(`/api/public/cita/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reply: next }),
      });
      const payload = (await response.json()) as PublicAppointment & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "No se pudo registrar tu respuesta.");
        return;
      }
      setAppointment(payload);
    } catch {
      setError("No se pudo registrar tu respuesta. Inténtalo de nuevo.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f7f4ee] text-[#14241f]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(15,110,86,0.14),transparent_68%)]" />
      <div className="relative mx-auto grid w-full max-w-lg gap-8 px-5 py-8 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center lg:gap-20 lg:py-20">
        <div>
          <header className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e5f3ee] text-[#0f2922]">
              <Paw />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[0.16em] text-[#0f2922]">PELUDITO</p>
              <p className="truncate text-sm text-[#24312d]">{appointment.clinicName}</p>
            </div>
          </header>

          <p className="mt-10 text-[13px] font-semibold tracking-[0.14em] text-[#0c4f3e] uppercase">
            {occasion}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[3.25rem] leading-none font-medium tracking-tight text-[#14241f] sm:text-7xl">
            {appointment.petName}
          </h1>
          <p className="mt-4 max-w-md text-lg leading-8 text-[#14241f]">
            {appointment.clientFirstName ? `Hola, ${appointment.clientFirstName}. ` : "Hola. "}
            {breed || species ? `${petLine}. ` : ""}
            Revisa la hora y confirma si vas a venir.
          </p>
        </div>

        <article className="rounded-[28px] bg-white px-5 py-6 shadow-[0_28px_70px_-36px_rgba(20,36,31,0.45)] ring-1 ring-[#14241f]/8 sm:px-7 sm:py-7">
          <p className="text-sm text-[#24312d]">{dateLabel(appointment.date)}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none font-medium tracking-tight text-[#14241f]">
            {appointment.time}
          </p>
          {Number(appointment.durationMinutes) > 0 ? (
            <p className="mt-3 text-sm text-[#24312d]">{Number(appointment.durationMinutes)} minutos</p>
          ) : null}

          <dl className="mt-6">
            <Detail label="Servicio">{appointment.reason}</Detail>
            <Detail label="Veterinario">
              <span className="block">{appointment.vetName}</span>
              {appointment.vetSpecialty ? (
                <span className="mt-0.5 block text-sm font-normal text-[#24312d]">
                  {appointment.vetSpecialty}
                </span>
              ) : null}
            </Detail>
            <Detail label="Clínica">
              <span className="block">{appointment.clinicName}</span>
              {appointment.clinicAddress ? (
                <span className="mt-0.5 block text-sm font-normal text-[#24312d]">
                  {appointment.clinicAddress}
                </span>
              ) : null}
              {appointment.clinicPhone ? (
                <a
                  className="mt-1 inline-block text-sm font-semibold text-[#0f6e56] underline decoration-[#0f6e56]/30 underline-offset-4"
                  href={`tel:${appointment.clinicPhone}`}
                >
                  {formatPhone(appointment.clinicPhone)}
                </a>
              ) : null}
            </Detail>
            {Number(appointment.estimatedPrice) > 0 ? (
              <Detail label="Precio estimado">
                {formatCurrency(Number(appointment.estimatedPrice))}
              </Detail>
            ) : null}
          </dl>

          <div className="mt-2 rounded-2xl bg-[#f3faf7] px-4 py-4 text-[#14241f]">
            <p className="text-[13px] font-semibold tracking-wide text-[#0f6e56]">Para la visita</p>
            <p className="mt-1.5 text-sm leading-6 text-[#24312d]">
              {visitNote(appointment.serviceType, appointment.petName)}
            </p>
          </div>

          {confirmed && !declined && !closed ? (
            <p className="mt-4 rounded-2xl bg-[#e7f6ef] px-4 py-3.5 text-sm leading-6 font-medium text-[#0b5c40]">
              Asistencia confirmada. Te esperamos con {appointment.petName}.
            </p>
          ) : null}
          {declined && !closed ? (
            <p className="mt-4 rounded-2xl bg-[#fff6e8] px-4 py-3.5 text-sm leading-6 text-[#7a4b08]">
              Avisamos a la clínica. La hora sigue reservada hasta que recepción la mueva. Si al final puedes venir, confirma desde aquí.
            </p>
          ) : null}
          {past ? (
            <p className="mt-4 rounded-2xl bg-[#f6f3ee] px-4 py-3.5 text-sm leading-6 text-[#24312d]">
              Esta cita ya pasó. Conserva este enlace como comprobante.
            </p>
          ) : null}
          {closed && !past ? (
            <p className="mt-4 rounded-2xl bg-[#f6f3ee] px-4 py-3.5 text-sm leading-6 text-[#24312d]">
              Esta cita ya no admite cambios.
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm font-medium text-[#9f1239]" role="alert">
              {error}
            </p>
          ) : null}

          {closed ? null : confirmed && !declined ? (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void reply("no_puede")}
              className="mt-4 w-full text-center text-sm text-[#3d4f48] underline decoration-[#3d4f48]/35 underline-offset-4 disabled:opacity-60"
            >
              {pending === "no_puede"
                ? "Avisando…"
                : "¿Cambio de planes? Avisar que no puedo asistir"}
            </button>
          ) : (
            <div className="mt-5 grid gap-2.5">
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void reply("confirmada")}
                className="h-12 rounded-2xl bg-[#0f2922] text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {pending === "confirmada" ? "Confirmando…" : "Confirmar asistencia"}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void reply("no_puede")}
                className="h-12 rounded-2xl border border-[#e4ddd2] bg-white text-[15px] font-semibold text-[#14241f] disabled:opacity-60"
              >
                {pending === "no_puede" ? "Avisando…" : "No puedo asistir"}
              </button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
