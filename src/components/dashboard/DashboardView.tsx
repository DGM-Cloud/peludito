"use client";

import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatCard";
import { DEMO_TODAY } from "@/config/demo";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { appointmentsService } from "@/services/appointments.service";
import { patientsService } from "@/services/patients.service";
import { reportsService } from "@/services/reports.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { appointmentStatuses } from "@/data/constants/statuses";
import { formatCurrency } from "@/utils/formatCurrency";
import { getGreeting } from "@/utils/formatDate";
import { siteConfig } from "@/config/site";
import {
  CalendarDays,
  ClipboardPlus,
  PawPrint,
  Plus,
  ShoppingCart,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function DashboardView() {
  const { version, role, refresh } = useDemo();
  const modal = useModal();

  const data = useMemo(() => {
    void version;
    const kpis = reportsService.getOperationalKpis(DEMO_TODAY);
    const alerts = reportsService.getAlerts();
    const upcoming = appointmentsService
      .getAppointmentsByDate(DEMO_TODAY)
      .filter((a) =>
        ["programada", "confirmada", "llego", "en_consulta"].includes(a.status),
      )
      .slice(0, 8);
    const activity = reportsService.getRecentActivity();
    return { kpis, alerts, upcoming, activity };
  }, [version]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}, {siteConfig.demoUser.shortName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            ¿Qué necesita tu equipo atender ahora? · Vista{" "}
            <span className="font-medium text-foreground">
              {role === "recepcion"
                ? "Recepción"
                : role === "veterinario"
                  ? "Veterinario"
                  : role === "caja"
                    ? "Caja"
                    : "Administrador"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
            Nueva cita
          </Button>
          <Link href="/patients">
            <Button size="sm" variant="outline" leftIcon={<UserPlus className="h-4 w-4" />}>
              Nuevo paciente
            </Button>
          </Link>
          <Link href="/medical-records">
            <Button size="sm" variant="outline" leftIcon={<ClipboardPlus className="h-4 w-4" />}>
              Registrar consulta
            </Button>
          </Link>
          <Link href="/pos">
            <Button size="sm" variant="secondary" leftIcon={<ShoppingCart className="h-4 w-4" />}>
              Registrar venta
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Citas de hoy"
          value={data.kpis.appointmentsToday}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Pacientes esperando"
          value={data.kpis.waiting}
          icon={<PawPrint className="h-5 w-5" />}
        />
        <StatCard
          label="Consultas atendidas"
          value={data.kpis.attended}
          icon={<ClipboardPlus className="h-5 w-5" />}
        />
        <StatCard
          label="Ingresos del día"
          value={formatCurrency(data.kpis.incomeToday)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Pagos pendientes"
          value={data.kpis.pendingPayments}
          hint={`${data.kpis.hospitalized} hospitalizados`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Agenda inmediata"
              description="Próximas atenciones de hoy"
              action={
                <Link href="/appointments" className="text-sm text-primary hover:underline">
                  Ver agenda
                </Link>
              }
            />
            <div className="space-y-2">
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-muted">No hay citas pendientes hoy.</p>
              ) : (
                data.upcoming.map((apt) => {
                  const patient = patientsService.getPatientById(apt.patientId);
                  const status = appointmentStatuses.find((s) => s.value === apt.status);
                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-12 text-sm font-semibold text-primary">
                          {apt.time}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {patient?.name} · {apt.reason}
                          </p>
                          <p className="text-xs text-muted">
                            {veterinariansService.getVeterinarianById(apt.veterinarianId)?.name}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        label={status?.label ?? apt.status}
                        tone={(status?.color as "success" | "warning" | "primary" | "danger" | "muted") ?? "default"}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {(role === "administrador" || role === "caja") && (
            <Card>
              <CardHeader title="Actividad reciente" />
              <ul className="space-y-3">
                {data.activity.map((item) => (
                  <li key={item.id} className="border-b border-border pb-3 last:border-0">
                    <p className="text-sm">{item.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(item.timestamp).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Alertas operativas" description="Requieren acción" />
            <ul className="space-y-3">
              {data.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-lg bg-background px-3 py-3 text-sm"
                >
                  <p className="font-medium text-foreground">{alert.message}</p>
                  <Link
                    href={alert.href}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    {alert.actionLabel} →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {role === "recepcion" || role === "veterinario" ? (
            <Card>
              <CardHeader title="Acceso rápido" />
              <div className="flex flex-col gap-2">
                <Link href="/follow-ups">
                  <Button variant="outline" className="w-full justify-start">
                    Seguimientos pendientes
                  </Button>
                </Link>
                <Link href="/vaccines">
                  <Button variant="outline" className="w-full justify-start">
                    Vacunas por vencer
                  </Button>
                </Link>
                <Link href="/hospitalization">
                  <Button variant="outline" className="w-full justify-start">
                    Hospitalizados
                  </Button>
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <AppointmentForm
        open={modal.open}
        onClose={modal.closeModal}
        onSubmit={(data) => {
          appointmentsService.createAppointment(data);
          refresh();
        }}
        defaultDate={DEMO_TODAY}
      />
    </div>
  );
}
