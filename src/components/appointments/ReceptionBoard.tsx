"use client";

import { Button } from "@/components/ui/Button";
import { serviceTypeOptions } from "@/data/constants/categories";
import { appointmentStatuses } from "@/data/constants/statuses";
import { patients as knownPortraits } from "@/data/mock/patients";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { assetPath } from "@/utils/assetPath";
import { limaClock } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { Calendar, MessageCircle, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const PX = 4;
const GAP = 8;
const MIN_BLOCK = 128;
const OPEN = 8 * 60;
const CLOSE = 20 * 60;

type VetColumn = { id: string; name: string };

type Placed = {
  appointment: Appointment;
  lane: number;
  lanes: number;
  top: number;
  height: number;
};

export function ReceptionBoard({
  dateIso,
  vets,
  appointments,
  notifiedIds,
  busyId,
  onOpen,
  onArrive,
  onConsult,
  onCharge,
  onMenu,
  onNotify,
  onCreate,
}: {
  dateIso: string;
  vets: VetColumn[];
  appointments: Appointment[];
  notifiedIds: ReadonlySet<string>;
  busyId: string | null;
  onOpen: (appointment: Appointment) => void;
  onArrive: (appointment: Appointment) => void;
  onConsult: (appointment: Appointment) => void;
  onCharge: (appointment: Appointment) => void;
  onMenu: (appointment: Appointment, x: number, y: number) => void;
  onNotify: (appointment: Appointment) => void;
  onCreate: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrolledKey = useRef("");
  const [now, setNow] = useState<ReturnType<typeof limaClock> | null>(null);
  const [spotlight, setSpotlight] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(limaClock());
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  const { start, end } = useMemo(() => dayWindow(appointments), [appointments]);
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let minute = start; minute < end; minute += 60) list.push(minute);
    return list;
  }, [start, end]);
  const boardHeight = (end - start) * PX + 120;
  const isToday = now?.isoDate === dateIso;

  const columns = useMemo(
    () =>
      vets.map((vet) => ({
        vet,
        placed: placeColumn(
          appointments.filter((item) => item.veterinarianId === vet.id),
          start,
          end,
        ),
      })),
    [appointments, vets, start, end],
  );

  const waitingRoom = appointments.filter((item) => item.status === "llego");
  const inConsult = appointments.filter((item) => item.status === "en_consulta");
  const unanswered = appointments.filter(
    (item) => item.status === "programada" && !item.clientReply,
  );
  const declined = appointments.filter(
    (item) =>
      item.clientReply === "no_puede" &&
      (item.status === "programada" || item.status === "confirmada"),
  );
  const upcoming = appointments
    .filter((item) => item.status === "programada" || item.status === "confirmada")
    .filter((item) => !isToday || (now ? minutes(item.time) >= now.minutesOfDay - 15 : false))
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !now) return;
    const key = dateIso;
    if (scrolledKey.current === key) return;
    scrolledKey.current = key;
    const first = [...appointments].sort((a, b) => a.time.localeCompare(b.time))[0];
    const passed = appointments
      .filter((item) => !isToday || minutes(item.time) <= now.minutesOfDay)
      .sort((a, b) => a.time.localeCompare(b.time));
    const target = passed[passed.length - 1] ?? first;
    const anchor = target ? minutes(target.time) : now.minutesOfDay;
    node.scrollTop = Math.max(0, (anchor - start) * PX - 72);
  }, [appointments, dateIso, isToday, now, start]);

  const reveal = (appointment: Appointment | undefined) => {
    if (!appointment) return;
    setSpotlight(appointment.id);
    document.getElementById(`board-${appointment.id}`)?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
    window.setTimeout(() => {
      setSpotlight((current) => (current === appointment.id ? null : current));
    }, 1600);
  };

  const grid = `minmax(15.5rem, 1fr)`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Pulse
          label="En sala"
          value={String(waitingRoom.length)}
          detail={waitingRoom.length ? petNames(waitingRoom) : "Nadie esperando"}
          tone={waitingRoom.length ? "primary" : "quiet"}
          onClick={() => reveal(waitingRoom[0])}
        />
        <Pulse
          label="En consulta"
          value={String(inConsult.length)}
          detail={inConsult.length ? petNames(inConsult) : "Consultorios libres"}
          tone={inConsult.length ? "warning" : "quiet"}
          onClick={() => reveal(inConsult[0])}
        />
        <Pulse
          label="Sin confirmar"
          value={String(unanswered.length)}
          detail={
            declined.length
              ? `${declined.length} ${declined.length === 1 ? "avisó que no puede" : "avisaron que no pueden"}`
              : unanswered.length
                ? petNames(unanswered)
                : "Todas respondidas"
          }
          tone={unanswered.length ? "neutral" : "quiet"}
          onClick={() => reveal(declined[0] ?? unanswered[0])}
        />
        <Pulse
          label="Próxima"
          value={upcoming ? upcoming.time : "—"}
          detail={
            upcoming
              ? `${petName(upcoming.patientId)} · ${serviceLabel(upcoming)}`
              : "No queda nadie por llegar"
          }
          tone={upcoming ? "primary" : "quiet"}
          onClick={() => reveal(upcoming)}
        />
      </div>

      <section
        aria-label="Tablero del día"
        className="overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <div
          ref={scrollerRef}
          className="max-h-[min(44rem,calc(100dvh-16.5rem))] overflow-auto"
        >
          <div className="min-w-max">
            <div className="sticky top-0 z-30 flex border-b border-border bg-surface">
              <div className="sticky left-0 z-40 w-14 shrink-0 border-r border-border bg-surface" />
              <div
                className="grid flex-1"
                style={{ gridTemplateColumns: `repeat(${Math.max(vets.length, 1)}, ${grid})` }}
              >
                {columns.map(({ vet, placed }) => {
                  const seeing = placed.some((item) => item.appointment.status === "en_consulta");
                  return (
                    <div key={vet.id} className="border-l border-border px-3 py-2.5 first:border-l-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{vet.name}</p>
                        {seeing ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-warning" title="En consulta" />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted">
                        {placed.length === 0
                          ? "Libre"
                          : `${placed.length} ${placed.length === 1 ? "cita" : "citas"}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-0 flex" style={{ height: boardHeight }}>
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-border bg-surface">
                {hours.map((hour) => (
                  <div key={hour} className="relative" style={{ height: 60 * PX }}>
                    <span className="absolute left-0 top-1 w-full text-center text-[11px] font-medium tabular-nums text-muted">
                      {clock(hour)}
                    </span>
                  </div>
                ))}
                {isToday && now && now.minutesOfDay >= start && now.minutesOfDay <= end ? (
                  <span
                    className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white"
                    style={{ top: (now.minutesOfDay - start) * PX }}
                  >
                    {clock(now.minutesOfDay)}
                  </span>
                ) : null}
              </div>

              <div
                className="relative grid flex-1 bg-background"
                style={{ gridTemplateColumns: `repeat(${Math.max(vets.length, 1)}, ${grid})` }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute right-0 left-0 border-t border-border"
                    style={{ top: (hour - start) * PX }}
                  >
                    <div
                      className="absolute right-0 left-0 border-t border-dashed border-border/80"
                      style={{ top: 30 * PX }}
                    />
                  </div>
                ))}

                {columns.map(({ vet, placed }) => (
                  <div key={vet.id} className="relative border-l border-border/70 first:border-l-0">
                    {placed.length === 0 ? (
                      <p className="pointer-events-none absolute top-8 right-3 left-3 text-center text-xs text-muted">
                        Sin citas
                      </p>
                    ) : null}
                    {placed.map((item) => (
                      <AppointmentBlock
                        key={item.appointment.id}
                        item={item}
                        spotlight={spotlight === item.appointment.id}
                        notified={notifiedIds.has(item.appointment.id)}
                        busy={busyId === item.appointment.id}
                        onOpen={onOpen}
                        onArrive={onArrive}
                        onConsult={onConsult}
                        onCharge={onCharge}
                        onMenu={onMenu}
                        onNotify={onNotify}
                      />
                    ))}
                  </div>
                ))}

                {isToday && now && now.minutesOfDay >= start && now.minutesOfDay <= end ? (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 h-px bg-primary"
                    style={{ top: (now.minutesOfDay - start) * PX }}
                  />
                ) : null}

                {appointments.length === 0 ? (
                  <div className="absolute inset-x-0 top-16 flex justify-center">
                    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-5 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Día libre</p>
                      <p className="mt-1 text-xs text-muted">No hay citas en esta fecha.</p>
                      <Button className="mt-3" size="sm" onClick={onCreate}>
                        Nueva cita
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pulse({
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "warning" | "neutral" | "quiet";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-background",
        tone === "primary" && "border-primary/30",
        tone === "warning" && "border-warning/40",
        tone === "neutral" && "border-border",
        tone === "quiet" && "border-border",
      )}
    >
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>
    </button>
  );
}

function AppointmentBlock({
  item,
  spotlight,
  notified,
  busy,
  onOpen,
  onArrive,
  onConsult,
  onCharge,
  onMenu,
  onNotify,
}: {
  item: Placed;
  spotlight: boolean;
  notified: boolean;
  busy: boolean;
  onOpen: (appointment: Appointment) => void;
  onArrive: (appointment: Appointment) => void;
  onConsult: (appointment: Appointment) => void;
  onCharge: (appointment: Appointment) => void;
  onMenu: (appointment: Appointment, x: number, y: number) => void;
  onNotify: (appointment: Appointment) => void;
}) {
  const appointment = item.appointment;
  const patient = patientsService.getPatientById(appointment.patientId);
  const client = clientsService.getClientById(appointment.clientId);
  const name = patient?.name ?? "Mascota";
  const status = appointmentStatuses.find((entry) => entry.value === appointment.status);
  const reply = replyOf(appointment, notified);
  const action = nextAction(appointment.status);
  const roomy = item.height >= 112;
  const showMeta = item.height >= 96;
  const canNotify =
    appointment.status === "programada" || appointment.status === "confirmada";
  const quiet = appointment.status === "pagada" || appointment.status === "cancelada" || appointment.status === "no_asistio";
  const declined =
    appointment.clientReply === "no_puede" &&
    (appointment.status === "programada" || appointment.status === "confirmada");

  const runAction = () => {
    if (busy) return;
    if (appointment.status === "programada" || appointment.status === "confirmada") onArrive(appointment);
    else if (appointment.status === "llego" || appointment.status === "en_consulta") onConsult(appointment);
    else if (appointment.status === "atendida") onCharge(appointment);
  };

  return (
    <article
      id={`board-${appointment.id}`}
      className={cn(
        "absolute overflow-hidden rounded-xl border border-l-4 bg-surface",
        toneClass(appointment.status, declined),
        spotlight && "ring-2 ring-primary ring-offset-1",
        quiet && "opacity-70",
      )}
      style={{
        top: item.top + 4,
        height: item.height,
        left: `calc(${item.lane} * (100% / ${item.lanes}) + 6px)`,
        width: `calc(100% / ${item.lanes} - 12px)`,
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(appointment, event.clientX, event.clientY);
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        className={cn(
          "flex h-full w-full flex-col px-2.5 pt-2 text-left",
          action ? "pb-10" : "pb-2",
        )}
      >
        <span className={cn("flex items-center gap-2", !action && "pr-8")}>
          <span className="text-[11px] font-semibold tabular-nums text-primary">
            {appointment.time}–{clock(minutes(appointment.time) + (appointment.durationMinutes || 30))}
          </span>
          <span className="truncate text-[11px] text-muted">{status?.label}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          {roomy ? (
            <PetFace
              id={appointment.patientId}
              name={name}
              breed={patient?.breed ?? ""}
              photoUrl={patient?.photoUrl}
            />
          ) : null}
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate text-sm font-semibold text-foreground",
                (appointment.status === "cancelada" || appointment.status === "no_asistio") && "line-through",
              )}
            >
              {name}
            </span>
            {showMeta ? (
              <span className="block truncate text-xs text-muted">{appointment.reason}</span>
            ) : null}
          </span>
        </span>
        {roomy && (client?.name || canNotify) ? (
          <span className="mt-1 flex min-w-0 items-center gap-1.5">
            {client?.name ? (
              <span className="truncate text-[11px] text-muted">{client.name}</span>
            ) : null}
            {canNotify ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  reply.className,
                )}
              >
                {reply.label}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>

      {action ? (
        <div className="absolute right-1.5 bottom-1.5 left-1.5 z-10 flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={runAction}
            className="h-8 min-w-0 flex-1 truncate rounded-lg bg-primary px-2 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "Un momento…" : action}
          </button>
          {canNotify ? (
            <button
              type="button"
              aria-label={notified ? `WhatsApp ya abierto para ${name}` : `Avisar a ${client?.name ?? "el cliente"} por WhatsApp`}
              title={notified ? "WhatsApp ya se abrió" : "Avisar por WhatsApp"}
              onClick={() => onNotify(appointment)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface",
                notified ? "text-primary" : "text-muted hover:text-foreground",
              )}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          ) : null}
          <IconMenu name={name} onClick={(x, y) => onMenu(appointment, x, y)} />
        </div>
      ) : (
        <div className="absolute top-1.5 right-1.5 z-10">
          <IconMenu name={name} onClick={(x, y) => onMenu(appointment, x, y)} />
        </div>
      )}
    </article>
  );
}

function IconMenu({ name, onClick }: { name: string; onClick: (x: number, y: number) => void }) {
  return (
    <button
      type="button"
      aria-label={`Más acciones de la cita de ${name}`}
      aria-haspopup="menu"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onClick(rect.left, rect.bottom + 6);
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground"
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  );
}

function PetFace({
  id,
  name,
  breed,
  photoUrl,
}: {
  id: string;
  name: string;
  breed: string;
  photoUrl?: string;
}) {
  const [failed, setFailed] = useState(false);
  const known = knownPortraits.find((pet) => pet.name === name && pet.breed === breed);
  const src = photoUrl?.trim()
    ? photoUrl
    : assetPath(`/patients/${known?.id ?? id}.jpg`);

  if (failed) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary-light">
      <Image
        src={src}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function nextAction(status: AppointmentStatus) {
  if (status === "programada" || status === "confirmada") return "Llegó";
  if (status === "llego") return "Abrir consulta";
  if (status === "en_consulta") return "Continuar";
  if (status === "atendida") return "Cobrar";
  return null;
}

function toneClass(status: AppointmentStatus, declined: boolean) {
  if (declined) return "border-danger/30 border-l-danger bg-danger-light/50";
  if (status === "confirmada") return "border-success/25 border-l-success bg-success-light/40";
  if (status === "llego") return "border-primary/25 border-l-primary bg-primary-light/60";
  if (status === "en_consulta") return "border-warning/35 border-l-warning bg-warning-light";
  if (status === "atendida") return "border-primary/20 border-l-primary bg-surface";
  if (status === "pagada") return "border-success/20 border-l-success bg-background";
  if (status === "cancelada" || status === "no_asistio") return "border-danger/20 border-l-danger bg-danger-light/40";
  return "border-border border-l-muted bg-surface";
}

function replyOf(appointment: Appointment, notified: boolean) {
  if (appointment.clientReply === "no_puede") {
    return { label: "No puede venir", className: "bg-danger-light text-danger" };
  }
  if (appointment.clientReply === "confirmada" || appointment.status === "confirmada") {
    return { label: "Confirmó", className: "bg-success-light text-success" };
  }
  if (notified) {
    return { label: "Avisado", className: "bg-primary-light text-primary" };
  }
  return { label: "Sin respuesta", className: "bg-background text-muted" };
}

function petName(patientId: string) {
  return patientsService.getPatientById(patientId)?.name ?? "Mascota";
}

function petNames(items: Appointment[]) {
  const names = items.map((item) => petName(item.patientId));
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function serviceLabel(appointment: Appointment) {
  return (
    serviceTypeOptions.find((option) => option.value === appointment.serviceType)?.label ??
    appointment.reason
  );
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function clock(total: number) {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function dayWindow(items: Appointment[]) {
  let start = OPEN;
  let end = CLOSE;
  for (const item of items) {
    const begin = minutes(item.time);
    const finish = begin + Math.max(5, item.durationMinutes || 30);
    start = Math.min(start, Math.floor(begin / 60) * 60);
    end = Math.max(end, Math.ceil(finish / 60) * 60);
  }
  if (end <= start) end = start + 60;
  return { start, end };
}

function placeColumn(items: Appointment[], dayStart: number, dayEnd: number): Placed[] {
  const sorted = [...items].sort(
    (a, b) => minutes(a.time) - minutes(b.time) || a.id.localeCompare(b.id),
  );
  const clusters: Appointment[][] = [];
  let cluster: Appointment[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    clusters.push(cluster);
    cluster = [];
    clusterEnd = -1;
  };

  for (const appointment of sorted) {
    const begin = minutes(appointment.time);
    if (cluster.length && begin >= clusterEnd) flush();
    cluster.push(appointment);
    clusterEnd = Math.max(clusterEnd, begin + Math.max(5, appointment.durationMinutes || 30));
  }
  flush();

  const placed: Placed[] = [];
  for (const group of clusters) {
    const laneEnds: number[] = [];
    const assigned: { appointment: Appointment; lane: number }[] = [];
    for (const appointment of group) {
      const begin = minutes(appointment.time);
      const finish = begin + Math.max(5, appointment.durationMinutes || 30);
      let lane = laneEnds.findIndex((value) => value <= begin);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(finish);
      } else {
        laneEnds[lane] = finish;
      }
      assigned.push({ appointment, lane });
    }
    const lanes = Math.max(1, laneEnds.length);
    for (let lane = 0; lane < lanes; lane += 1) {
      const laneItems = assigned
        .filter((entry) => entry.lane === lane)
        .sort((a, b) => minutes(a.appointment.time) - minutes(b.appointment.time));
      laneItems.forEach((entry, index) => {
        const begin = minutes(entry.appointment.time);
        const finish = begin + Math.max(5, entry.appointment.durationMinutes || 30);
        const natural = Math.max(44, (finish - begin) * PX - GAP);
        const next = laneItems[index + 1];
        const room = next
          ? Math.max(44, (minutes(next.appointment.time) - begin) * PX - GAP)
          : Math.max(natural, (dayEnd - begin) * PX - GAP);
        const height = Math.min(Math.max(natural, MIN_BLOCK), room);
        placed.push({
          appointment: entry.appointment,
          lane,
          lanes,
          top: (begin - dayStart) * PX,
          height: Math.max(44, height),
        });
      });
    }
  }
  return placed;
}
