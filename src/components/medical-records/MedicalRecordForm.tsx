"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type {
  CreateMedicalRecordInput,
  MedicalRecord,
} from "@/types/medical-record";
import { calculateAge } from "@/utils/calculateAge";
import { cn } from "@/utils/cn";
import { formatPhone } from "@/utils/formatPhone";
import Image from "next/image";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMedicalRecordInput) => void;
  onUpdate?: (id: string, data: Partial<MedicalRecord>) => void;
  initial?: MedicalRecord | null;
  lockedPatientId?: string;
  lockedVetId?: string;
  defaultReason?: string;
};

function buildInitial(
  initial: MedicalRecord | null | undefined,
  lockedPatientId: string | undefined,
  lockedVetId: string | undefined,
  defaultReason: string | undefined,
) {
  const patients = patientsService.getPatients();
  const vets = veterinariansService.getVeterinarians();
  if (initial) {
    return {
      patientId: initial.patientId,
      veterinarianId: initial.veterinarianId,
      date: initial.date,
      reason: initial.reason,
      symptoms: initial.symptoms,
      diagnosis: initial.diagnosis,
      treatment: initial.treatment,
      medications: initial.medications.join(", "),
      observations: initial.observations ?? "",
      weight: "",
    };
  }
  return {
    patientId: lockedPatientId ?? patients[0]?.id ?? "",
    veterinarianId: lockedVetId ?? vets[0]?.id ?? "",
    date: DEMO_TODAY,
    reason: defaultReason ?? "",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    medications: "",
    observations: "",
    weight: "",
  };
}

export function MedicalRecordForm({
  open,
  onClose,
  onSubmit,
  onUpdate,
  initial,
  lockedPatientId,
  lockedVetId,
  defaultReason,
}: Props) {
  const { toast } = useToast();
  const patients = patientsService.getPatients();
  const vets = veterinariansService.getVeterinarians();
  const editing = Boolean(initial);

  const [form, setForm] = useState(() =>
    buildInitial(initial, lockedPatientId, lockedVetId, defaultReason),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason) {
      toast("Indica el motivo de la consulta");
      return;
    }

    const meds = form.medications
      ? form.medications.split(",").map((m) => m.trim()).filter(Boolean)
      : [];

    const observations = [
      form.observations,
      form.weight ? `Peso registrado: ${form.weight} kg` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (editing && initial && onUpdate) {
      onUpdate(initial.id, {
        reason: form.reason,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        medications: meds,
        observations: observations || undefined,
        status: form.diagnosis ? "cerrada" : "abierta",
      });
      if (form.weight) {
        patientsService.updatePatient(form.patientId, {
          weight: Number(form.weight),
        });
      }
      toast("✓ Consulta guardada correctamente");
      onClose();
      return;
    }

    onSubmit({
      patientId: form.patientId,
      veterinarianId: form.veterinarianId,
      date: form.date,
      reason: form.reason,
      symptoms: form.symptoms,
      diagnosis: form.diagnosis,
      treatment: form.treatment,
      medications: meds,
      observations: observations || undefined,
      status: form.diagnosis ? "cerrada" : "abierta",
    });
    if (form.weight) {
      patientsService.updatePatient(form.patientId, {
        weight: Number(form.weight),
      });
    }
    toast("✓ Consulta registrada correctamente");
    onClose();
  };

  const patient = patients.find((p) => p.id === form.patientId);
  const vet = vets.find((v) => v.id === form.veterinarianId);
  const owner = patient
    ? clientsService.getClientById(patient.clientId)
    : undefined;
  const identityLocked = editing || Boolean(lockedPatientId);
  const vetLocked = editing || Boolean(lockedVetId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Completar consulta" : "Nueva consulta"}
      size="xl"
      bodyClassName="px-6 py-6 sm:px-8 sm:py-8"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="mr-form">
            {editing ? "Guardar consulta" : "Registrar consulta"}
          </Button>
        </>
      }
    >
      <form id="mr-form" onSubmit={handleSubmit} className="space-y-8">
        <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-start">
          {patient ? <PatientThumb id={patient.id} name={patient.name} /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">Paciente</p>
            {identityLocked && patient ? (
              <>
                <p className="mt-1 text-2xl font-semibold leading-tight">
                  {patient.name}
                </p>
                <p className="mt-2 text-base leading-relaxed">
                  {speciesLabel[patient.species]} · {patient.breed}
                </p>
                <p className="text-base leading-relaxed text-muted">
                  {patient.sex === "hembra" ? "Hembra" : "Macho"} ·{" "}
                  {calculateAge(patient.birthDate)} · {patient.weight} kg
                </p>
                {owner ? (
                  <dl className="mt-4 space-y-3">
                    <ContextFact label="Propietario" value={owner.name} />
                    <ContextFact
                      label="Teléfono"
                      value={formatPhone(owner.phone)}
                    />
                  </dl>
                ) : null}
              </>
            ) : (
              <div className="mt-2 max-w-sm">
                <Select
                  label="Paciente"
                  options={patients.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={form.patientId}
                  onChange={(e) =>
                    setForm({ ...form, patientId: e.target.value })
                  }
                />
              </div>
            )}
            {patient && patient.allergies.length > 0 ? (
              <p className="mt-3 inline-flex rounded-lg bg-danger-light px-3 py-1.5 text-sm font-medium text-danger">
                Alergias: {patient.allergies.join(", ")}
              </p>
            ) : null}
          </div>
          <dl className="grid gap-4 sm:w-56">
            <div>
              {vetLocked ? (
                <ContextFact
                  label="Veterinario"
                  value={vet?.name ?? "Sin asignar"}
                />
              ) : (
                <Select
                  label="Veterinario"
                  options={vets.map((v) => ({ value: v.id, label: v.name }))}
                  value={form.veterinarianId}
                  onChange={(e) =>
                    setForm({ ...form, veterinarianId: e.target.value })
                  }
                />
              )}
            </div>
            <div>
              {editing ? (
                <ContextFact label="Fecha" value={formatClinicDate(form.date)} />
              ) : (
                <label className="block">
                  <span className="text-sm text-muted">Fecha</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              )}
            </div>
            <div>
              <label className="block">
                <span className="text-sm text-muted">Peso en consulta (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder={patient ? String(patient.weight) : "Opcional"}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {patient ? (
                  <span className="mt-1 block text-sm text-muted">
                    Último registro: {patient.weight} kg
                  </span>
                ) : null}
              </label>
            </div>
          </dl>
        </header>

        <section className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Nota clínica</h3>
            <p className="mt-1 text-base leading-relaxed text-muted">
              {form.diagnosis
                ? "Con diagnóstico, la consulta se cierra al guardar."
                : "Escribe el diagnóstico para cerrar la consulta. Si lo dejas vacío, queda abierta."}
            </p>
          </div>

          <NoteField
            label="Motivo de consulta"
            value={form.reason}
            onChange={(reason) => setForm({ ...form, reason })}
            rows={2}
            required
          />
          <NoteField
            label="Hallazgos"
            hint="Lo que se observa en esta visita."
            value={form.symptoms}
            onChange={(symptoms) => setForm({ ...form, symptoms })}
            rows={3}
          />
          <NoteField
            label="Diagnóstico"
            hint="Este dato cierra la consulta."
            value={form.diagnosis}
            onChange={(diagnosis) => setForm({ ...form, diagnosis })}
            rows={3}
            emphasized={!form.diagnosis}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <NoteField
              label="Plan de tratamiento"
              value={form.treatment}
              onChange={(treatment) => setForm({ ...form, treatment })}
              rows={4}
            />
            <NoteField
              label="Medicación"
              hint="Un medicamento por coma. Ejemplo: Apoquel, Meloxicam."
              value={form.medications}
              onChange={(medications) => setForm({ ...form, medications })}
              rows={4}
            />
          </div>
          <NoteField
            label="Indicaciones al propietario"
            value={form.observations}
            onChange={(observations) => setForm({ ...form, observations })}
            rows={3}
          />
        </section>
      </form>
    </Modal>
  );
}

const speciesLabel = {
  perro: "Perro",
  gato: "Gato",
  ave: "Ave",
  conejo: "Conejo",
} as const;

function formatClinicDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-base font-medium leading-snug">{value}</dd>
    </div>
  );
}

function NoteField({
  label,
  hint,
  value,
  onChange,
  rows,
  required,
  emphasized,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
  emphasized?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-base font-medium">{label}</span>
      {required ? <span className="text-danger"> *</span> : null}
      {hint ? (
        <span className="mt-1 block text-sm leading-relaxed text-muted">
          {hint}
        </span>
      ) : null}
      <textarea
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 w-full resize-y rounded-xl border bg-surface px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted focus:outline-none focus:ring-2",
          emphasized
            ? "border-primary/40 focus:border-primary focus:ring-primary/20"
            : "border-border focus:border-primary focus:ring-primary/20",
        )}
      />
    </label>
  );
}

function PatientThumb({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-3xl font-semibold text-primary">
        {name.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-primary-light">
      <Image
        src={`/patients/${id}.jpg`}
        alt={`Foto de ${name}`}
        fill
        sizes="112px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
