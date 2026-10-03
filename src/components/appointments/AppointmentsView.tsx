"use client";

import { AppointmentBriefing } from "@/components/appointments/AppointmentBriefing";
import { AppointmentContextMenu } from "@/components/appointments/AppointmentContextMenu";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatCard";
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
import { assetPath } from "@/utils/assetPath";
import { useToast } from "@/components/ui/Toast";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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
  const { version, refresh, clinicId } = useDemo();
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

  const setStatus = (id: string, status: AppointmentStatus) => {
    if (status === "cancelada" || status === "no_asistio") {
      const label =
        status === "cancelada" ? "cancelar esta cita" : "marcar como no asistió";
      if (!window.confirm(`¿Seguro que deseas ${label}?`)) return;
    }
    const updated = appointmentsService.updateStatus(id, status);
    if (!updated) {
      toast("Ese cambio no está permitido. La cita solo avanza.");
      return;
    }
    const label =
      appointmentStatuses.find((s) => s.value === status)?.label ?? status;
    toast(`Estado actualizado: ${label}`, {
      label: "Deshacer",
      onClick: () => {
        const reverted = appointmentsService.correctLastStep(id);
        if (!reverted) {
          toast("Ya no se puede deshacer ese cambio.");
          return;
        }
        const back =
          appointmentStatuses.find((s) => s.value === reverted.status)?.label ??
          reverted.status;
        toast(`Cita devuelta a ${back}`);
        refresh();
      },
    });
    refresh();
  };

  const correctStatus = (apt: Appointment) => {
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
    const reverted = appointmentsService.correctLastStep(apt.id);
    if (!reverted) {
      toast("No se pudo corregir el estado.");
      return;
    }
    toast(`Cita devuelta a ${label}`);
    refresh();
  };

  const openConsult = (apt: Appointment) => {
    let recordId = apt.medicalRecordId;
    if (!recordId) {
      const record = medicalRecordsService.createMedicalRecord({
        patientId: apt.patientId,
        veterinarianId: apt.veterinarianId,
        date: apt.date,
        reason: apt.reason,
        symptoms: "",
        diagnosis: "",
        treatment: "",
        medications: [],
        status: "abierta",
      });
      recordId = record.id;
    }
    appointmentsService.updateAppointment(apt.id, {
      medicalRecordId: recordId,
    });
    if (apt.status !== "en_consulta") {
      appointmentsService.updateStatus(apt.id, "en_consulta");
    }
    refresh();
    toast("✓ Consulta abierta — completa el diagnóstico");
    router.push(`/medical-records?record=${recordId}`);
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniStat label="Citas" value={stats.total} />
        <MiniStat label="Atendidas" value={stats.atendidas} />
        <MiniStat label="Canceladas" value={stats.canceladas} />
        <MiniStat label="No asistieron" value={stats.noAsistieron} />
        <MiniStat label="Pendientes" value={stats.pendientes} />
      </div>

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
        <Card padding={false}>
          {dayItems.length === 0 ? (
            <EmptyState
              title="No hay citas para este día."
              description="Agenda una nueva cita para comenzar."
              actionLabel="Nueva cita"
              onAction={modal.openModal}
              icon={<Calendar className="h-5 w-5" />}
            />
          ) : (
            <ul className="divide-y divide-border">
              <li className="px-4 py-2 text-xs text-muted">
                Clic en la cita para ver al paciente. Clic derecho o ⋯ para cambiar el estado.
              </li>
              {dayItems.map((apt) => {
                const patient = patientsService.getPatientById(apt.patientId);
                const client = clientsService.getClientById(apt.clientId);
                const vet = veterinariansService.getVeterinarianById(
                  apt.veterinarianId,
                );
                const status = appointmentStatuses.find(
                  (s) => s.value === apt.status,
                );

                return (
                  <li key={apt.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => openBriefing(apt)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openMenu(apt, e.clientX, e.clientY);
                      }}
                      className="flex min-w-0 flex-1 cursor-context-menu items-center gap-3 px-4 py-3 text-left hover:bg-background/70"
                    >
                      <span className="w-14 shrink-0 text-sm font-semibold text-primary">
                        {apt.time}
                      </span>
                      <Image
                        src={assetPath(`/patients/${apt.patientId}.jpg`)}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          <span className="text-primary">{patient?.name}</span>
                          {" · "}
                          {apt.reason}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {client?.name} · {vet?.name}
                        </p>
                      </div>
                      <StatusBadge
                        label={status?.label ?? apt.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "primary"
                            | "danger"
                            | "muted") ?? "default"
                        }
                      />
                    </button>
                    <div className="flex items-center pr-2">
                      <button
                        type="button"
                        aria-label={`Acciones de la cita de ${patient?.name ?? "paciente"}`}
                        aria-haspopup="menu"
                        className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          openMenu(apt, rect.left, rect.bottom + 6);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
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

      {/* Multi-vet board for day */}
      {view === "day" && vetFilter === "all" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {vets.map((vet) => {
            const list = dayItems.filter((a) => a.veterinarianId === vet.id);
            return (
              <Card key={vet.id} className="!p-4">
                <p className="mb-3 text-sm font-semibold">{vet.name}</p>
                {list.length === 0 ? (
                  <p className="text-xs text-muted">Sin citas</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMenu(a, e.clientX, e.clientY);
                          }}
                          onClick={() => openBriefing(a)}
                          className="w-full cursor-context-menu rounded-md px-1 py-0.5 text-left text-xs hover:bg-background"
                        >
                          <span className="font-semibold text-primary">{a.time}</span>{" "}
                          {patientsService.getPatientById(a.patientId)?.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
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
              />
            );
          })()
        : null}

      <AppointmentForm
        key={`apt-${prefillClientId ?? ""}-${prefillPatientId ?? ""}-${formOpen}`}
        open={formOpen}
        onClose={() => {
          modal.closeModal();
          if (urlOpen) router.replace("/appointments");
        }}
        onSubmit={(data) => {
          appointmentsService.createAppointment(data);
          refresh();
        }}
        defaultDate={toISODate(cursor)}
        defaultClientId={prefillClientId}
        defaultPatientId={prefillPatientId}
      />
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
