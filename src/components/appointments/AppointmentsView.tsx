"use client";

import { AppointmentBriefing } from "@/components/appointments/AppointmentBriefing";
import { AppointmentContextMenu } from "@/components/appointments/AppointmentContextMenu";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { ReceptionBoard } from "@/components/appointments/ReceptionBoard";
import { TransferTratanteModal } from "@/components/appointments/TransferTratanteModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { DEMO_TODAY } from "@/config/demo";
import { appointmentStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { cn } from "@/utils/cn";
import { formatLongDate } from "@/utils/formatDate";
import { appointmentShareText, whatsappHref } from "@/utils/whatsapp";
import { useToast } from "@/components/ui/Toast";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NOTICE_KEY = "peludito.wa-notified";

type ViewMode = "day" | "week" | "month";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function AppointmentsView() {
  const { version, refresh, publish, clinicId, clinic, role, veterinarianId } =
    useDemo();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useModal();
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState(new Date(`${DEMO_TODAY}T12:00:00`));
  const [vetFilter, setVetFilter] = useState("all");
  const [menu, setMenu] = useState<{
    appointmentId: string;
    x: number;
    y: number;
  } | null>(null);
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [transferApt, setTransferApt] = useState<Appointment | null>(null);
  const canTransfer = role === "recepcion" || role === "administrador";
  const openingConsultId = useRef<string | null>(null);
  const [consultOpening, setConsultOpening] = useState<string | null>(null);
  const pendingStatusId = useRef<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTICE_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw) as unknown;
      if (Array.isArray(ids)) setNotifiedIds(new Set(ids.filter((id) => typeof id === "string")));
    } catch {
      /* el aviso queda solo en esta sesión */
    }
  }, []);

  const prefillClientId = searchParams.get("client") ?? undefined;
  const prefillPatientId = searchParams.get("patient") ?? undefined;
  const urlOpen = Boolean(prefillClientId || prefillPatientId);
  const formOpen = modal.open || urlOpen;

  const appointments = useMemo(
    () =>
      appointmentsService
        .getAppointments()
        .filter((a) => a.clinicId === clinicId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, clinicId],
  );

  const stats = appointmentsService.getTodayStats(toISODate(cursor));
  const vets = veterinariansService.getVeterinarians();

  const dayItems = useMemo(() => {
    const iso = toISODate(cursor);
    return appointments
      .filter(
        (a) =>
          a.date === iso &&
          (vetFilter === "all" || a.veterinarianId === vetFilter),
      )
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, cursor, vetFilter]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenu = (apt: Appointment, x: number, y: number) => {
    setMenu({ appointmentId: apt.id, x, y });
  };

  const openBriefing = (apt: Appointment) => {
    setMenu(null);
    setBriefingId(apt.id);
  };

  const setStatus = async (id: string, status: AppointmentStatus) => {
    if (pendingStatusId.current) return;
    if (status === "cancelada" || status === "no_asistio") {
      const label =
        status === "cancelada" ? "cancelar esta cita" : "marcar como no asistió";
      if (!window.confirm(`¿Seguro que deseas ${label}?`)) return;
    }
    pendingStatusId.current = id;
    setBusyId(id);
    try {
      await appointmentsService.updateStatus(id, status);
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Ese cambio no está permitido. La cita solo avanza.");
      return;
    } finally {
      pendingStatusId.current = null;
      setBusyId(null);
    }
    const label =
      appointmentStatuses.find((s) => s.value === status)?.label ?? status;
    toast(`Estado actualizado: ${label}`, {
      label: "Deshacer",
      onClick: () => {
        void (async () => {
          try {
            const reverted = await appointmentsService.correctLastStep(id);
            const back =
              appointmentStatuses.find((s) => s.value === reverted.status)?.label ??
              reverted.status;
            toast(`Cita devuelta a ${back}`);
            publish();
            void refresh();
          } catch {
            toast("Ya no se puede deshacer ese cambio.");
          }
        })();
      },
    });
    publish();
    void refresh();
  };

  const correctStatus = async (apt: Appointment) => {
    const target = appointmentsService.getCorrectionTarget(apt);
    if (!target) {
      toast(
        apt.status === "pagada"
          ? "Una cita cobrada no vuelve atrás desde la agenda."
          : "Esta cita no tiene un estado anterior para corregir.",
      );
      return;
    }
    const label =
      appointmentStatuses.find((s) => s.value === target)?.label ?? target;
    const keepsRecord =
      apt.status === "en_consulta"
        ? " La historia clínica abierta se conserva."
        : "";
    if (
      !window.confirm(
        `La cita solo avanza. ¿Corregir el error y volver a «${label}»?${keepsRecord}`,
      )
    ) {
      return;
    }
    try {
      await appointmentsService.correctLastStep(apt.id);
    } catch {
      toast("No se pudo corregir el estado.");
      return;
    }
    toast(`Cita devuelta a ${label}`);
    publish();
    void refresh();
  };

  const openConsult = async (apt: Appointment) => {
    if (openingConsultId.current) return;
    if (
      role === "veterinario" &&
      (!veterinarianId || apt.veterinarianId !== veterinarianId)
    ) {
      toast(
        "Esta cita está asignada a otro médico. Pide a recepción que te la transfiera.",
      );
      return;
    }
    openingConsultId.current = apt.id;
    const patientName =
      patientsService.getPatientById(apt.patientId)?.name ?? "la mascota";
    setConsultOpening(patientName);
    setMenu(null);
    setBriefingId(null);
    try {
      const current = appointmentsService.getAppointmentById(apt.id) ?? apt;
      let recordId = current.medicalRecordId;
      if (!recordId) {
        const record = await medicalRecordsService.createMedicalRecord({
          patientId: current.patientId,
          veterinarianId: current.veterinarianId,
          date: current.date,
          reason: current.reason,
          symptoms: "",
          diagnosis: "",
          treatment: "",
          medications: [],
          status: "abierta",
        });
        recordId = record.id;
      }
      await appointmentsService.updateAppointment(current.id, {
        medicalRecordId: recordId,
      });
      if (current.status !== "en_consulta") {
        await appointmentsService.updateStatus(current.id, "en_consulta");
      }
      publish();
      void refresh();
      router.push(`/consultas?record=${recordId}`);
    } catch (reason) {
      toast(
        reason instanceof Error ? reason.message : "No se pudo abrir la consulta.",
      );
    } finally {
      openingConsultId.current = null;
      setConsultOpening(null);
    }
  };

  const notifyOwner = (apt: Appointment) => {
    const patient = patientsService.getPatientById(apt.patientId);
    const client = clientsService.getClientById(apt.clientId);
    const vet = veterinariansService.getVeterinarianById(apt.veterinarianId);
    if (!apt.publicToken) {
      toast("Esta cita no tiene enlace para el cliente.");
      return;
    }
    const href = whatsappHref(
      client?.phone ?? "",
      appointmentShareText({
        clinicName: clinic.name,
        clientName: client?.name ?? "",
        petName: patient?.name ?? "tu mascota",
        serviceName: apt.reason,
        dateLabel: formatLongDate(apt.date),
        time: apt.time,
        vetName: vet?.name ?? "",
        link: `${window.location.origin}/cita/${apt.publicToken}`,
      }),
    );
    if (!href) {
      toast("Este cliente no tiene un celular válido para WhatsApp.");
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
    setNotifiedIds((current) => {
      const next = new Set(current);
      next.add(apt.id);
      try {
        localStorage.setItem(NOTICE_KEY, JSON.stringify([...next]));
      } catch {
        /* si el navegador bloquea el almacenamiento, el aviso sigue en pantalla */
      }
      return next;
    });
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  return (
    <>
      {view === "day" ? null : (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MiniStat label="Citas" value={stats.total} />
          <MiniStat label="Atendidas" value={stats.atendidas} />
          <MiniStat label="Canceladas" value={stats.canceladas} />
          <MiniStat label="No asistieron" value={stats.noAsistieron} />
          <MiniStat label="Pendientes" value={stats.pendientes} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            tabs={[
              { id: "day", label: "Día" },
              { id: "week", label: "Semana" },
              { id: "month", label: "Mes" },
            ]}
            activeId={view}
            onChange={(id) => setView(id as ViewMode)}
          />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="!px-2" onClick={() => navigate(-1)} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date(`${DEMO_TODAY}T12:00:00`))}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" className="!px-2" onClick={() => navigate(1)} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {cursor.toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <select
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            value={vetFilter}
            onChange={(e) => setVetFilter(e.target.value)}
            aria-label="Filtrar por veterinario"
          >
            <option value="all">Todos los veterinarios</option>
            {vets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nueva cita
        </Button>
      </div>

      {view === "day" ? (
        <ReceptionBoard
          dateIso={toISODate(cursor)}
          vets={
            vetFilter === "all"
              ? vets.map((vet) => ({ id: vet.id, name: vet.name }))
              : vets
                  .filter((vet) => vet.id === vetFilter)
                  .map((vet) => ({ id: vet.id, name: vet.name }))
          }
          appointments={dayItems}
          notifiedIds={notifiedIds}
          busyId={busyId}
          onOpen={openBriefing}
          onArrive={(apt) => void setStatus(apt.id, "llego")}
          onConsult={(apt) => void openConsult(apt)}
          onCharge={(apt) => router.push(`/pos?appointment=${apt.id}`)}
          onMenu={openMenu}
          onNotify={notifyOwner}
          onCreate={modal.openModal}
        />
      ) : null}

      {view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const iso = toISODate(day);
            const items = appointments.filter(
              (a) =>
                a.date === iso &&
                (vetFilter === "all" || a.veterinarianId === vetFilter),
            );
            return (
              <Card key={iso} className="min-h-[160px] !p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted">
                  {day.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" })}
                </p>
                <div className="space-y-1.5">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted">Sin citas</p>
                  ) : (
                    items.map((apt) => {
                      const patient = patientsService.getPatientById(apt.patientId);
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMenu(apt, e.clientX, e.clientY);
                          }}
                          onClick={() => openBriefing(apt)}
                          className="block w-full cursor-context-menu rounded-md bg-primary-light px-2 py-1 text-left text-xs text-primary hover:bg-primary-light/70"
                        >
                          <span className="font-semibold">{apt.time}</span>{" "}
                          {patient?.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <Card padding={false}>
          <div className="grid grid-cols-7 border-b border-border text-center text-xs font-medium uppercase text-muted">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="px-1 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((day) => {
              const iso = toISODate(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const count = appointments.filter((a) => a.date === iso).length;
              const isToday = iso === DEMO_TODAY;
              return (
                <button
                  key={iso + day.getMonth()}
                  type="button"
                  onClick={() => {
                    setCursor(day);
                    setView("day");
                  }}
                  className={cn(
                    "min-h-[72px] border-b border-r border-border p-2 text-left hover:bg-background",
                    !inMonth && "bg-background/50 text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && "bg-primary text-white",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 ? (
                    <p className="mt-1 text-[10px] text-primary">
                      {count} cita{count > 1 ? "s" : ""}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {briefingId
        ? (() => {
            const apt = appointments.find((a) => a.id === briefingId);
            if (!apt) return null;
            return (
              <AppointmentBriefing
                appointment={apt}
                onClose={() => setBriefingId(null)}
                onOpenConsult={() => {
                  setBriefingId(null);
                  openConsult(apt);
                }}
              />
            );
          })()
        : null}

      {menu
        ? (() => {
            const apt = appointments.find((a) => a.id === menu.appointmentId);
            if (!apt) return null;
            const patient = patientsService.getPatientById(apt.patientId);
            return (
              <AppointmentContextMenu
                appointment={apt}
                patientName={patient?.name ?? "Paciente"}
                x={menu.x}
                y={menu.y}
                onClose={closeMenu}
                onChangeStatus={(status) => setStatus(apt.id, status)}
                onCorrect={() => correctStatus(apt)}
                onOpenConsult={() => openConsult(apt)}
                onCharge={() => router.push(`/pos?appointment=${apt.id}`)}
                onOpenPatient={() => router.push(`/patients/${apt.patientId}`)}
                onNotify={() => notifyOwner(apt)}
                onTransfer={
                  canTransfer ? () => setTransferApt(apt) : undefined
                }
              />
            );
          })()
        : null}

      <TransferTratanteModal
        appointment={transferApt}
        open={Boolean(transferApt)}
        onClose={() => setTransferApt(null)}
        onDone={() => {
          publish();
          void refresh();
        }}
      />

      <AppointmentForm
        key={`apt-${prefillClientId ?? ""}-${prefillPatientId ?? ""}-${formOpen}`}
        open={formOpen}
        onClose={() => {
          modal.closeModal();
          if (urlOpen) router.replace("/appointments");
        }}
        onSubmit={async (data) => {
          const created = await appointmentsService.createAppointment(data);
          publish();
          void refresh();
          return created;
        }}
        defaultDate={toISODate(cursor)}
        defaultClientId={prefillClientId}
        defaultPatientId={prefillPatientId}
      />

      {consultOpening ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background px-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-primary" />
          <p className="mt-4 text-base font-semibold text-foreground">Abriendo la consulta</p>
          <p className="mt-1 text-sm text-muted">Preparando la historia de {consultOpening}</p>
        </div>
      ) : null}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
