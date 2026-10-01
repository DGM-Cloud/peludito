"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatCard";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { Tabs } from "@/components/ui/Tabs";
import {
  appointmentStatuses,
  paymentMethods,
  vaccinationStatuses,
} from "@/data/constants/statuses";
import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { salesService } from "@/services/sales.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Patient } from "@/types/patient";
import { calculateAge } from "@/utils/calculateAge";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PatientHub({ patient }: { patient: Patient }) {
  const [tab, setTab] = useState("resumen");
  const owner = clientsService.getClientById(patient.clientId);
  const history = medicalRecordsService.getRecordsByPatientId(patient.id);
  const vaccines = vaccinationsService.getByPatientId(patient.id);
  const meds = vaccinationsService.getMedicationsByPatientId(patient.id);
  const nextApt = appointmentsService
    .getAppointmentsByPatientId(patient.id)
    .find((a) =>
      ["programada", "confirmada", "llego", "en_consulta"].includes(a.status),
    );
  const sales = salesService
    .getSales()
    .filter((s) => s.patientId === patient.id);
  const lastRecord = history[0];

  return (
    <div>
      <Link href="/patients" className="text-sm text-primary hover:underline">
        ← Volver a pacientes
      </Link>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {patient.breed} · {calculateAge(patient.birthDate)} ·{" "}
            {patient.sex === "hembra" ? "Hembra" : "Macho"} · {patient.weight} kg
          </p>
          <p className="mt-2 text-sm">
            Propietario:{" "}
            {owner ? (
              <Link
                href={`/clients/${owner.id}`}
                className="font-medium text-primary hover:underline"
              >
                {owner.name}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/medical-records?patient=${patient.id}`}>
            <Button size="sm">Nueva consulta</Button>
          </Link>
          <Link
            href={`/appointments?client=${patient.clientId}&patient=${patient.id}`}
          >
            <Button size="sm" variant="outline">
              Nueva cita
            </Button>
          </Link>
          <Link href={`/vaccines?patient=${patient.id}`}>
            <Button size="sm" variant="outline">
              Registrar vacuna
            </Button>
          </Link>
          <Link
            href={`/pos?client=${patient.clientId}&patient=${patient.id}`}
          >
            <Button size="sm" variant="secondary">
              Registrar venta
            </Button>
          </Link>
          <WhatsAppAction label="Indicaciones WA" />
        </div>
      </div>

      {/* Critical emergency strip */}
      <div className="mt-4 rounded-xl border border-danger/30 bg-danger-light/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-danger">
          Información crítica (emergencia)
        </p>
        <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted">Alergias</p>
            <p className="font-semibold">
              {patient.allergies.length
                ? patient.allergies.join(", ")
                : "Ninguna registrada"}
            </p>
          </div>
          <div>
            <p className="text-muted">Medicamentos activos</p>
            <p className="font-semibold">
              {meds.filter((m) => m.active).map((m) => m.name).join(", ") ||
                "Ninguno"}
            </p>
          </div>
          <div>
            <p className="text-muted">Último diagnóstico</p>
            <p className="font-semibold">{lastRecord?.diagnosis ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted">Última consulta</p>
            <p className="font-semibold">
              {lastRecord ? formatDate(lastRecord.date) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "resumen", label: "Resumen" },
            { id: "historia", label: "Historia" },
            { id: "vacunas", label: "Vacunas" },
            { id: "tratamientos", label: "Tratamientos" },
            { id: "citas", label: "Citas" },
            { id: "ventas", label: "Ventas" },
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
              <CardHeader title="Información general" />
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Info label="Especie" value={patient.species} />
                <Info label="Raza" value={patient.breed} />
                <Info label="Nacimiento" value={formatDate(patient.birthDate)} />
                <Info label="Peso" value={`${patient.weight} kg`} />
                <Info
                  label="Microchip"
                  value={patient.microchip ?? "No registrado"}
                />
                <Info
                  label="Estado"
                  value={patient.status === "activo" ? "Activo" : "Inactivo"}
                />
              </dl>
            </Card>
            <Card>
              <CardHeader title="Próxima cita" />
              {nextApt ? (
                <div className="text-sm">
                  <p className="font-medium">
                    {formatDate(nextApt.date)} · {nextApt.time}
                  </p>
                  <p className="text-muted">{nextApt.reason}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">Sin citas programadas.</p>
              )}
            </Card>
          </div>
        ) : null}

        {tab === "historia" ? (
          <Card>
            <CardHeader title="Timeline clínico" />
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <Badge variant="primary">Consultas</Badge>
              <Badge>Vacunas</Badge>
              <Badge>Medicamentos</Badge>
            </div>
            <ol className="relative space-y-0 border-l border-border pl-6">
              {history.map((record) => {
                const vet = veterinariansService.getVeterinarianById(
                  record.veterinarianId,
                );
                return (
                  <li key={record.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-xs text-muted">{formatDate(record.date)}</p>
                    <Link
                      href={`/medical-records?record=${record.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {record.reason}
                    </Link>
                    <p className="text-sm text-muted">
                      {record.diagnosis || "Sin diagnóstico aún"} · {vet?.name}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Card>
        ) : null}

        {tab === "vacunas" ? (
          <Card>
            <ul className="space-y-3">
              {vaccines.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-muted">
                      Lote {v.lot} · {v.laboratory} · Próxima{" "}
                      {formatDate(v.nextDue)}
                    </p>
                  </div>
                  <StatusBadge
                    label={
                      vaccinationStatuses.find((s) => s.value === v.status)
                        ?.label ?? v.status
                    }
                    tone={
                      (vaccinationStatuses.find((s) => s.value === v.status)
                        ?.color as "success" | "warning" | "danger" | "muted") ??
                      "default"
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {tab === "tratamientos" ? (
          <Card>
            <ul className="space-y-3">
              {meds.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted">
                    {m.dosage} · {m.frequency}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {tab === "citas" ? (
          <Card>
            <ul className="space-y-3">
              {appointmentsService.getAppointmentsByPatientId(patient.id).map((a) => {
                const st = appointmentStatuses.find((s) => s.value === a.status);
                return (
                  <li key={a.id} className="flex justify-between text-sm">
                    <span>
                      {formatDate(a.date)} {a.time} · {a.reason}
                    </span>
                    <StatusBadge
                      label={st?.label ?? a.status}
                      tone={
                        (st?.color as
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
          </Card>
        ) : null}

        {tab === "ventas" ? (
          <Card>
            {sales.length === 0 ? (
              <p className="text-sm text-muted">Sin ventas asociadas.</p>
            ) : (
              <ul className="space-y-3">
                {sales.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span>
                      {formatDate(s.date)} ·{" "}
                      {paymentMethods.find((p) => p.value === s.paymentMethod)
                        ?.label ?? s.paymentMethod}
                    </span>
                    <span className="font-medium">{formatCurrency(s.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "documentos" ? (
          <Card>
            <div className="flex flex-col gap-2">
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Receta (demo)
              </Button>
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Resultados (demo)
              </Button>
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                Certificado (demo)
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 capitalize">{value}</dd>
    </div>
  );
}
