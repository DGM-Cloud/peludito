"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatCard";
import {
  appointmentStatuses,
  hospitalizationStatuses,
  vaccinationStatuses,
} from "@/data/constants/statuses";
import { clientsService } from "@/services/clients.service";
import { hospitalizationsService } from "@/services/hospitalizations.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Appointment } from "@/types/appointment";
import { calculateAge } from "@/utils/calculateAge";
import { assetPath } from "@/utils/assetPath";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const speciesLabel = {
  perro: "Perro",
  gato: "Gato",
  ave: "Ave",
  conejo: "Conejo",
} as const;

export function AppointmentBriefing({
  appointment,
  onClose,
  onOpenConsult,
}: {
  appointment: Appointment;
  onClose: () => void;
  onOpenConsult: () => void;
}) {
  const patient = patientsService.getPatientById(appointment.patientId);
  const owner = patient
    ? clientsService.getClientById(patient.clientId)
    : undefined;
  const vet = veterinariansService.getVeterinarianById(
    appointment.veterinarianId,
  );
  const history = patient
    ? medicalRecordsService.getRecordsByPatientId(patient.id).slice(0, 4)
    : [];
  const vaccines = patient
    ? vaccinationsService.getByPatientId(patient.id).slice(0, 3)
    : [];
  const meds = patient
    ? vaccinationsService
        .getMedicationsByPatientId(patient.id)
        .filter((m) => m.active)
    : [];
  const hospitalized = patient
    ? hospitalizationsService
        .getActive()
        .find((h) => h.patientId === patient.id)
    : undefined;
  const status = appointmentStatuses.find((s) => s.value === appointment.status);
  const canConsult = ["confirmada", "llego", "en_consulta"].includes(
    appointment.status,
  );
  const router = useRouter();

  if (!patient) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="2xl"
      bodyClassName="px-6 py-6 sm:px-8 sm:py-8"
      title={`${appointment.time} · ${appointment.reason}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              router.push(`/patients/${patient.id}`);
            }}
          >
            Ver ficha completa
          </Button>
          {canConsult ? (
            <Button onClick={onOpenConsult}>
              {appointment.status === "en_consulta"
                ? "Continuar consulta"
                : "Abrir consulta"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-0">
        <section className="min-w-0 lg:pr-8">
          <h3 className="text-sm font-semibold text-muted">Paciente</h3>
          <div className="mt-3">
          <PatientPhoto
            src={assetPath(`/patients/${patient.id}.jpg`)}
            name={patient.name}
          />
          </div>
          <p className="mt-4 text-2xl font-semibold leading-tight">
            {patient.name}
          </p>
          <dl className="mt-5 space-y-4">
            <Fact
              label="Especie"
              value={`${speciesLabel[patient.species]} · ${patient.breed}`}
            />
            <Fact
              label="Sexo y edad"
              value={`${patient.sex === "hembra" ? "Hembra" : "Macho"} · ${calculateAge(patient.birthDate)}`}
            />
            <Fact label="Peso" value={`${patient.weight} kg`} />
            <Fact label="Propietario" value={owner?.name ?? "Sin propietario"} />
            {owner ? (
              <Fact label="Teléfono" value={formatPhone(owner.phone)} />
            ) : null}
          </dl>
          <div className="mt-5">
            {patient.allergies.length > 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3">
                <p className="text-sm font-semibold text-danger">Alergias</p>
                <p className="mt-1 text-lg font-medium leading-snug text-danger">
                  {patient.allergies.join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-base text-muted">Sin alergias registradas.</p>
            )}
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-muted">Vacunas</h3>
            {vaccines.length === 0 ? (
              <p className="mt-3 text-base text-muted">Sin vacunas registradas.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {vaccines.map((v) => {
                  const vacStatus = vaccinationStatuses.find(
                    (s) => s.value === v.status,
                  );
                  return (
                    <li key={v.id} className="text-base leading-relaxed">
                      <p className="font-medium">{v.name}</p>
                      <p className="mt-1 text-muted">
                        Próxima dosis {formatDate(v.nextDue)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge
                          label={vacStatus?.label ?? v.status}
                          tone={
                            (vacStatus?.color as
                              | "success"
                              | "warning"
                              | "danger"
                              | "muted") ?? "default"
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-5 lg:border-l lg:border-border lg:px-8">
          <h3 className="text-sm font-semibold text-muted">Cita de hoy</h3>
          {hospitalized ? (
            <div className="rounded-xl border border-warning/40 bg-warning-light px-4 py-4 text-base leading-relaxed">
              <p className="font-semibold">
                Hospitalizado · {hospitalized.cage}
              </p>
              <p className="mt-1">
                {hospitalized.reason} ·{" "}
                {hospitalizationStatuses.find(
                  (s) => s.value === hospitalized.status,
                )?.label ?? hospitalized.status}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Motivo</p>
            <StatusBadge
              label={status?.label ?? appointment.status}
              tone={
                (status?.color as
                  | "success"
                  | "warning"
                  | "primary"
                  | "danger"
                  | "muted") ?? "default"
              }
            />
          </div>
          <p className="text-xl font-semibold leading-snug">{appointment.reason}</p>
          <dl>
            <Fact label="Veterinario" value={vet?.name ?? "Sin asignar"} />
          </dl>
          {appointment.notes ? (
            <p className="text-base leading-relaxed text-muted">{appointment.notes}</p>
          ) : null}
          <div className="border-t border-border pt-5">
            <h4 className="text-base font-semibold">Tratamiento activo</h4>
            {meds.length === 0 ? (
              <p className="mt-2 text-base text-muted">Ninguno.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {meds.map((m) => (
                  <li key={m.id} className="text-base leading-relaxed">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted">
                      {m.dosage} · {m.frequency}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-8 lg:border-l lg:border-border lg:pl-8">
          <div>
            <h3 className="text-sm font-semibold text-muted">Historial reciente</h3>
            {history.length === 0 ? (
              <p className="mt-3 text-base text-muted">Sin consultas previas.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {history.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-xl border border-border px-5 py-5"
                  >
                    <p className="text-sm text-muted">{formatDate(record.date)}</p>
                    <p className="mt-2 text-lg font-medium leading-snug">
                      {record.reason}
                    </p>
                    <p className="mt-3 text-base leading-relaxed">
                      {record.diagnosis || "Sin diagnóstico"}
                    </p>
                    {record.treatment ? (
                      <p className="mt-2 text-base leading-relaxed text-muted">
                        {record.treatment}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-medium leading-snug">{value}</dd>
    </div>
  );
}

function PatientPhoto({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-primary-light text-3xl font-semibold text-primary">
        {name.slice(0, 1)}
      </div>
    );
  }

  return (
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-primary-light">
      <Image
        src={src}
        alt={`Foto de ${name}`}
        fill
        sizes="240px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
