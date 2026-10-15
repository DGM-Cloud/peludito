"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import {
  appointmentStatuses,
  paymentMethods,
  vaccinationStatuses,
} from "@/data/constants/statuses";
import { ClinicalAlerts, patientHasAlerts } from "@/components/patients/ClinicalAlerts";
import { PatientFileActions } from "@/components/patients/PatientFileActions";
import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { salesService } from "@/services/sales.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Patient } from "@/types/patient";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate, formatTime } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { formatPatientAge, reproductiveOptions, speciesLabel } from "@/utils/patient-fields";
import { cn } from "@/utils/cn";
import { ArrowLeft, Calendar, FileText, Scale, Syringe } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PatientHub({ patient }: { patient: Patient }) {
  const [tab, setTab] = useState("resumen");
  const owner = clientsService.getClientById(patient.clientId);
  const history = medicalRecordsService.getRecordsByPatientId(patient.id);
  const vaccines = vaccinationsService.getByPatientId(patient.id);
  const carnet = vaccinationsService.getCarnetByPatientId(patient.id);
  const timeline = [
    ...history.map((record) => ({
      kind: "consulta" as const,
      id: record.id,
      date: record.date,
      title: record.reason,
      subtitle: record.diagnosis || "Sin diagnóstico aún",
      veterinarianId: record.veterinarianId,
      status: record.status,
      href:
        record.status === "abierta" || record.status === "seguimiento"
          ? `/consultas?record=${record.id}`
          : `/medical-records?patient=${patient.id}&highlight=${record.id}`,
    })),
    ...vaccines.map((vac) => ({
      kind: "vacuna" as const,
      id: vac.id,
      date: vac.dateApplied,
      title: `Vacuna: ${vac.name}`,
      subtitle: `Lote ${vac.lot}${vac.nextDue ? ` · Próxima ${formatDate(vac.nextDue)}` : ""}`,
      veterinarianId: vac.veterinarianId,
      status: vac.status,
      href: `/vaccines?patient=${patient.id}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const meds = vaccinationsService.getMedicationsByPatientId(patient.id);
  const appointments = appointmentsService.getAppointmentsByPatientId(patient.id);
  const nextApt = appointments.find((item) =>
    ["programada", "confirmada", "llego", "en_consulta"].includes(item.status),
  );
  const nextVac = vaccines
    .filter((item) => item.status === "proxima" || item.status === "vencida")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "vencida" ? -1 : 1;
      return left.nextDue.localeCompare(right.nextDue);
    })[0];
  const sales = salesService.getSales().filter((item) => item.patientId === patient.id);
  const lastRecord = history[0];
  const activeMeds = meds.filter((item) => item.active);
  const deceased = patient.vitalStatus === "fallecido";
  const inactive = patient.status === "inactivo";
  const hasAlerts = patientHasAlerts(patient) || patient.allergies.length > 0;
  const sex = patient.sex === "hembra" ? "Hembra" : "Macho";
  const reproductive =
    reproductiveOptions.find((item) => item.value === patient.reproductiveStatus)?.label ?? "";
  const meta = [
    speciesLabel(patient.species),
    patient.breed || "Sin raza",
    sex,
    formatPatientAge(patient),
    patient.weight > 0 ? `${patient.weight} kg` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Pacientes
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <PetPortrait name={patient.name} photoUrl={patient.photoUrl} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
                {patient.code ? (
                  <span className="rounded-md bg-background px-2 py-0.5 text-xs font-medium text-muted">
                    {patient.code}
                  </span>
                ) : null}
                {deceased ? <Badge variant="danger">Fallecido</Badge> : null}
                {inactive ? <Badge variant="muted">Inactivo</Badge> : null}
                {hasAlerts && !deceased ? <Badge variant="warning">Alerta clínica</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted">{meta}</p>
              {patient.altName ? (
                <p className="mt-1 text-sm text-muted">También: {patient.altName}</p>
              ) : null}
              {deceased && patient.deceasedOn ? (
                <p className="mt-1 text-sm font-medium text-danger">
                  Fallecido el {formatDate(patient.deceasedOn)}
                </p>
              ) : null}
              <p className="mt-2 text-sm">
                Tutor:{" "}
                {owner ? (
                  <Link
                    href={`/clients/${owner.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {owner.name}
                  </Link>
                ) : (
                  <span className="text-muted">Sin tutor</span>
                )}
                {owner?.phone ? (
                  <span className="text-muted"> · {formatPhone(owner.phone)}</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/consultas?patient=${patient.id}`}>
              <Button size="sm">Nueva consulta</Button>
            </Link>
            <Link href={`/appointments?client=${patient.clientId}&patient=${patient.id}`}>
              <Button size="sm" variant="outline">
                Nueva cita
              </Button>
            </Link>
            <Link href={`/vaccines?patient=${patient.id}`}>
              <Button size="sm" variant="outline">
                Vacuna
              </Button>
            </Link>
            <Link href={`/pos?client=${patient.clientId}&patient=${patient.id}`}>
              <Button size="sm" variant="secondary">
                Venta
              </Button>
            </Link>
            <WhatsAppAction label="WhatsApp" />
            <PatientFileActions patient={patient} />
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {[
            {
              label: "Peso",
              value: patient.weight > 0 ? `${patient.weight} kg` : "—",
              icon: <Scale className="h-3.5 w-3.5" />,
            },
            {
              label: "Última consulta",
              value: lastRecord ? formatDate(lastRecord.date) : "—",
              icon: <FileText className="h-3.5 w-3.5" />,
            },
            {
              label: "Próxima cita",
              value: nextApt ? `${formatDate(nextApt.date)} ${nextApt.time}` : "—",
              icon: <Calendar className="h-3.5 w-3.5" />,
            },
            {
              label: "Vacuna",
              value: nextVac
                ? `${nextVac.status === "vencida" ? "Vencida" : "Próxima"} · ${formatDate(nextVac.nextDue)}`
                : "Al día",
              tone: (nextVac?.status === "vencida"
                ? "danger"
                : nextVac
                  ? "warning"
                  : undefined) as "danger" | "warning" | undefined,
              icon: <Syringe className="h-3.5 w-3.5" />,
            },
          ].map((item, index) => (
            <Stat key={item.label} index={index} {...item} />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Alertas clínicas</p>
            <p className="mt-0.5 text-xs text-muted">
              Lo que recepción y el veterinario deben ver antes de atender.
            </p>
          </div>
          {activeMeds.length > 0 ? (
            <p className="text-xs text-muted">
              Tratamiento:{" "}
              <span className="font-medium text-foreground">
                {activeMeds.map((item) => item.name).join(", ")}
              </span>
            </p>
          ) : null}
        </div>
        <div className="mt-4">
          <ClinicalAlerts patient={patient} />
        </div>
        {(lastRecord?.diagnosis || lastRecord) && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Último diagnóstico</p>
              <p className="mt-0.5 font-medium">{lastRecord?.diagnosis || "Sin diagnóstico"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Última consulta</p>
              <p className="mt-0.5 font-medium">
                {lastRecord
                  ? `${formatDate(lastRecord.date)} · ${lastRecord.reason}`
                  : "Sin consultas"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "resumen", label: "Resumen" },
            { id: "historia", label: `Historia${history.length ? ` (${history.length})` : ""}` },
            { id: "vacunas", label: `Vacunas${vaccines.length ? ` (${vaccines.length})` : ""}` },
            {
              id: "tratamientos",
              label: `Tratamientos${meds.length ? ` (${meds.length})` : ""}`,
            },
            { id: "citas", label: `Citas${appointments.length ? ` (${appointments.length})` : ""}` },
            { id: "ventas", label: `Ventas${sales.length ? ` (${sales.length})` : ""}` },
            { id: "documentos", label: "Documentos" },
          ]}
          activeId={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-6">
        {tab === "resumen" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Identificación" />
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Especie" value={speciesLabel(patient.species)} />
                <Info label="Raza" value={patient.breed || "Sin indicar"} />
                <Info label="Sexo" value={sex} />
                <Info label="Reproducción" value={reproductive || "Sin indicar"} />
                <Info label="Color y señas" value={patient.coat || "—"} />
                <Info label="Edad" value={formatPatientAge(patient)} />
                <Info
                  label="Microchip"
                  value={
                    patient.microchip
                      ? [
                          patient.microchip,
                          patient.microchipImplantedOn
                            ? formatDate(patient.microchipImplantedOn)
                            : "",
                          patient.microchipPlace,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "No registrado"
                  }
                />
                <Info
                  label="Estado"
                  value={
                    deceased
                      ? "Fallecido"
                      : inactive
                        ? "Inactivo"
                        : "Activo"
                  }
                />
              </dl>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Evolución del peso" />
                <WeightHistory patient={patient} />
              </Card>
              <Card>
                <CardHeader title="Próxima cita" />
                {nextApt ? (
                  <div className="text-sm">
                    <p className="font-medium">
                      {formatDate(nextApt.date)} · {nextApt.time}
                    </p>
                    <p className="mt-1 text-muted">{nextApt.reason}</p>
                    <Link
                      href="/appointments"
                      className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Ver en agenda
                    </Link>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-muted">Sin citas programadas.</p>
                    <Link
                      href={`/appointments?client=${patient.clientId}&patient=${patient.id}`}
                      className="mt-3 inline-block font-medium text-primary hover:underline"
                    >
                      Agendar cita
                    </Link>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "historia" ? (
          <Card>
            <CardHeader
              title="Timeline clínico"
              description="Consultas y vacunas en una sola línea de tiempo."
            />
            {timeline.length === 0 ? (
              <Empty
                text="Todavía no hay consultas ni vacunas en esta ficha."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/consultas?patient=${patient.id}`}>
                      <Button size="sm">Nueva consulta</Button>
                    </Link>
                    <Link href={`/vaccines?patient=${patient.id}`}>
                      <Button size="sm" variant="outline">
                        Registrar vacuna
                      </Button>
                    </Link>
                  </div>
                }
              />
            ) : (
              <ol className="relative space-y-0 border-l border-border pl-6">
                {timeline.map((item) => {
                  const vet = veterinariansService.getVeterinarianById(
                    item.veterinarianId,
                  );
                  return (
                    <li key={`${item.kind}-${item.id}`} className="relative pb-6 last:pb-0">
                      <span
                        className={cn(
                          "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full",
                          item.kind === "vacuna" ? "bg-amber-500" : "bg-primary",
                        )}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted">{formatDate(item.date)}</p>
                        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                          {item.kind === "vacuna" ? "Vacuna" : "Consulta"}
                        </span>
                      </div>
                      <Link
                        href={item.href}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">
                        {item.subtitle}
                        {vet?.name ? ` · ${vet.name}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        ) : null}

        {tab === "vacunas" ? (
          <Card>
            <CardHeader
              title="Carné de vacunación"
              description="Última dosis por vacuna y próxima fecha."
              action={
                <Link href={`/vaccines?patient=${patient.id}`}>
                  <Button size="sm" variant="outline">
                    Registrar vacuna
                  </Button>
                </Link>
              }
            />
            {carnet.length === 0 ? (
              <Empty text="Sin vacunas registradas." />
            ) : (
              <ul className="divide-y divide-border">
                {carnet.map((item) => {
                  const status = vaccinationStatuses.find(
                    (option) => option.value === item.status,
                  );
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Lote {item.lot}
                          {item.laboratory ? ` · ${item.laboratory}` : ""}
                          {" · "}Aplicada {formatDate(item.dateApplied)}
                          {item.nextDue
                            ? ` · Próxima ${formatDate(item.nextDue)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={status?.label ?? item.status}
                          tone={
                            (status?.color as
                              | "success"
                              | "warning"
                              | "danger"
                              | "muted") ?? "default"
                          }
                        />
                        {item.seriesStatus !== "completada" ? (
                          <Link
                            href={`/vaccines?patient=${patient.id}`}
                          >
                            <Button size="sm" variant="outline">
                              Refuerzo
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "tratamientos" ? (
          <Card>
            <CardHeader title="Tratamientos" />
            {meds.length === 0 ? (
              <Empty text="Sin tratamientos registrados." />
            ) : (
              <ul className="divide-y divide-border">
                {meds.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.dosage} · {item.frequency}
                      </p>
                    </div>
                    <Badge variant={item.active ? "success" : "muted"}>
                      {item.active ? "Activo" : "Finalizado"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "citas" ? (
          <Card>
            <CardHeader
              title="Citas"
              action={
                <Link href={`/appointments?client=${patient.clientId}&patient=${patient.id}`}>
                  <Button size="sm" variant="outline">
                    Nueva cita
                  </Button>
                </Link>
              }
            />
            {appointments.length === 0 ? (
              <Empty text="Sin citas en esta ficha." />
            ) : (
              <ul className="divide-y divide-border">
                {appointments.map((item) => {
                  const status = appointmentStatuses.find((option) => option.value === item.status);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">
                          {formatDate(item.date)} · {item.time}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{item.reason}</p>
                      </div>
                      <StatusBadge
                        label={status?.label ?? item.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "primary"
                            | "danger"
                            | "muted") ?? "muted"
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "ventas" ? (
          <Card>
            <CardHeader
              title="Ventas"
              action={
                <Link href={`/pos?client=${patient.clientId}&patient=${patient.id}`}>
                  <Button size="sm" variant="outline">
                    Nueva venta
                  </Button>
                </Link>
              }
            />
            {sales.length === 0 ? (
              <Empty text="Sin ventas asociadas." />
            ) : (
              <ul className="divide-y divide-border">
                {sales.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span>
                      {formatDate(item.date)} ·{" "}
                      {paymentMethods.find((option) => option.value === item.paymentMethod)
                        ?.label ?? item.paymentMethod}
                    </span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "documentos" ? (
          <Card>
            <CardHeader title="Documentos" />
            <p className="mb-4 text-sm text-muted">
              Recetas, resultados y certificados saldrán de la consulta. Por ahora son demos.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Receta
              </Button>
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Resultados
              </Button>
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Certificado
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function PetPortrait({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return <Avatar initials={petInitials(name)} size="lg" />;
}

function Stat({
  label,
  value,
  icon,
  tone,
  index,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "danger" | "warning";
  index: number;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3",
        index % 2 === 1 && "border-l border-border",
        index > 0 && "sm:border-l sm:border-border",
        index >= 2 && "border-t border-border sm:border-t-0",
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function WeightHistory({ patient }: { patient: Patient }) {
  const points = [...(patient.weights ?? [])].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        {patient.weight > 0
          ? `${patient.weight} kg, sin fecha de medición.`
          : "Todavía no hay un peso medido."}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {points.length > 1 ? (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points.map((item) => ({
                name: formatDate(item.measuredAt),
                kg: item.kg,
              }))}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} unit=" kg" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <ul className="space-y-2 text-sm">
        {[...points].reverse().map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3">
            <span>
              {item.kg} kg
              <span className="mt-0.5 block text-xs text-muted">
                {formatDate(item.measuredAt)} · {formatTime(item.measuredAt)}
                {item.recordedByName ? ` · ${item.recordedByName}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="py-2 text-sm text-muted">
      <p>{text}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function petInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase();
}
