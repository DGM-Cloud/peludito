"use client";

import { MedicationPlan } from "@/components/medical-records/MedicationPlan";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { patients as knownPortraits } from "@/data/mock/patients";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type {
  CreateMedicalRecordInput,
  MedicalRecord,
} from "@/types/medical-record";
import { ClinicalAlerts } from "@/components/patients/ClinicalAlerts";
import { formatPatientAge, speciesLabel } from "@/utils/patient-fields";
import { assetPath } from "@/utils/assetPath";
import { formatPhone } from "@/utils/formatPhone";
import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMedicalRecordInput) => void | Promise<void>;
  onUpdate?: (id: string, data: Partial<MedicalRecord>) => void | Promise<void>;
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
      medications: initial.medications,
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
    medications: [] as string[],
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
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() =>
    buildInitial(initial, lockedPatientId, lockedVetId, defaultReason),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (!form.reason) {
      toast("Indica el motivo de la consulta");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const meds = form.medications;

    const observations = [
      form.observations,
      form.weight ? `Peso registrado: ${form.weight} kg` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      if (editing && initial && onUpdate) {
        await onUpdate(initial.id, {
          reason: form.reason,
          symptoms: form.symptoms,
          diagnosis: form.diagnosis,
          treatment: form.treatment,
          medications: meds,
          observations: observations || undefined,
          status: form.diagnosis ? "cerrada" : "abierta",
        });
        if (form.weight) {
          await patientsService.updatePatient(form.patientId, {
            weight: Number(form.weight),
          });
        }
        toast("✓ Consulta guardada correctamente");
        onClose();
        return;
      }

      await onSubmit({
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
        await patientsService.updatePatient(form.patientId, {
          weight: Number(form.weight),
        });
      }
      toast("✓ Consulta registrada correctamente");
      onClose();
    } catch (error) {
      savingRef.current = false;
      setSaving(false);
      toast(error instanceof Error ? error.message : "No se pudo guardar la consulta");
    }
  };

  const requestClose = () => {
    if (savingRef.current) return;
    onClose();
  };

  const patient = patients.find((p) => p.id === form.patientId);
  const vet = vets.find((v) => v.id === form.veterinarianId);
  const owner = patient
    ? clientsService.getClientById(patient.clientId)
    : undefined;
  const identityLocked = editing || Boolean(lockedPatientId);
  const vetLocked = editing || Boolean(lockedVetId);

  const willClose = Boolean(form.diagnosis.trim());

  return (
    <>
    <Modal
      open={open}
      onClose={requestClose}
      title={editing ? "Consulta" : "Nueva consulta"}
      size="wide"
      bodyClassName="bg-background px-5 py-4 sm:px-6"
      dismissOnEscape={!saving}
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">
              {willClose
                ? "Con diagnóstico, la consulta se cierra al guardar."
                : "Sin diagnóstico, la consulta queda abierta."}
            </p>
            {editing && form.patientId ? (
              <a
                href={`/vaccines?patient=${form.patientId}&record=${initial?.id ?? ""}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Registrar vacuna en esta consulta
              </a>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={requestClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="mr-form" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar consulta" : "Registrar consulta"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="mr-form"
        onSubmit={handleSubmit}
        className="grid items-start gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]"
      >
        <aside className="rounded-xl border border-border bg-surface p-4">
          {patient ? (
            <div>
              <PatientPortrait
                id={patient.id}
                name={patient.name}
                breed={patient.breed}
                photoUrl={patient.photoUrl}
              />
              <p className="mt-3 truncate text-lg font-semibold leading-tight text-foreground">
                {patient.name}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {speciesLabel(patient.species)}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </p>
            </div>
          ) : null}

          <dl className="mt-4 space-y-3 border-t border-border pt-4">
            {identityLocked && patient ? (
              <>
                <Fact label="Sexo" value={patient.sex === "hembra" ? "Hembra" : "Macho"} />
                <Fact label="Edad" value={formatPatientAge(patient)} />
                <Fact label="Peso" value={patient.weight > 0 ? `${patient.weight} kg` : "Sin medición"} />
              </>
            ) : (
              <Select
                label="Paciente"
                options={patients.map((p) => ({ value: p.id, label: p.name }))}
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              />
            )}
            {owner ? (
              <>
                <Fact label="Propietario" value={owner.name} />
                <Fact label="Teléfono" value={formatPhone(owner.phone)} />
              </>
            ) : null}
            {vetLocked ? (
              <Fact label="Veterinario" value={vet?.name ?? "Sin asignar"} />
            ) : (
              <Select
                label="Veterinario"
                options={vets.map((v) => ({ value: v.id, label: v.name }))}
                value={form.veterinarianId}
                onChange={(e) => setForm({ ...form, veterinarianId: e.target.value })}
              />
            )}
            {editing ? (
              <Fact label="Fecha" value={formatClinicDate(form.date)} />
            ) : (
              <label className="block">
                <span className="text-[11px] font-medium text-muted">Fecha</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-medium text-muted">Peso hoy</span>
              <span className="mt-1 flex h-9 items-center rounded-lg border border-border bg-background pr-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder={patient ? String(patient.weight) : "—"}
                  aria-label="Peso en consulta, kilogramos"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                />
                <span className="text-xs text-muted">kg</span>
              </span>
            </label>
          </dl>

          {patient ? (
            <div className="mt-4">
              <ClinicalAlerts patient={patient} compact />
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
          <NoteField
            label="Motivo de consulta"
            value={form.reason}
            onChange={(reason) => setForm({ ...form, reason })}
            required
            placeholder="Por qué viene hoy"
          />
          <NoteField
            label="Hallazgos"
            value={form.symptoms}
            onChange={(symptoms) => setForm({ ...form, symptoms })}
            placeholder="Lo que se observa en esta visita"
          />
          <NoteField
            label="Diagnóstico"
            value={form.diagnosis}
            onChange={(diagnosis) => setForm({ ...form, diagnosis })}
            placeholder="Vacío: la consulta sigue abierta"
          />
          <NoteField
            label="Tratamiento"
            value={form.treatment}
            onChange={(treatment) => setForm({ ...form, treatment })}
            placeholder="Qué se hizo y qué sigue"
          />
          </div>

        <section className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Medicación</h3>
            <p className="text-xs text-muted">Busca, indica la dosis y agrega otra</p>
          </div>
          <MedicationPlan
            items={form.medications}
            onChange={(medications) => setForm({ ...form, medications })}
          />
        </section>

        <NoteField
          label="Indicaciones para casa"
          value={form.observations}
          onChange={(observations) => setForm({ ...form, observations })}
          placeholder="Qué debe hacer el propietario"
          short
        />
        </div>
      </form>
    </Modal>
    {saving ? (
      <div
        className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-primary" />
        <p className="mt-4 text-base font-semibold text-foreground">Guardando la consulta</p>
        <p className="mt-1 text-sm text-muted">
          {patient ? `Dejando lista la historia de ${patient.name}` : "Un momento"}
        </p>
      </div>
    ) : null}
    </>
  );
}

function formatClinicDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium leading-snug text-foreground">{value}</dd>
    </div>
  );
}

function NoteField({
  label,
  value,
  onChange,
  required,
  placeholder,
  short,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  short?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <textarea
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={
          short
            ? "mt-1.5 h-14 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-5 text-foreground placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            : "mt-1.5 h-[4.25rem] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-5 text-foreground placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        }
      />
    </label>
  );
}

function portraitFile(id: string, name: string, breed: string) {
  const known = knownPortraits.find((pet) => pet.name === name && pet.breed === breed);
  return known?.id ?? id;
}

function PatientPortrait({
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
  const src = photoUrl?.trim()
    ? photoUrl
    : assetPath(`/patients/${portraitFile(id, name, breed)}.jpg`);

  if (failed) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-2xl font-semibold text-primary">
        {name.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-primary-light">
      <Image
        src={src}
        alt={`Foto de ${name}`}
        fill
        sizes="96px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
