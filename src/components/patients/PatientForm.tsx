"use client";

import { ClientForm } from "@/components/clients/ClientForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { sexOptions } from "@/data/constants/categories";
import { clientsService } from "@/services/clients.service";
import type { Client } from "@/types/client";
import { patientsService } from "@/services/patients.service";
import type {
  AllergySeverity,
  AllergyStatus,
  HandlingAlert,
  InfoSource,
  Patient,
  ReproductiveStatus,
  Sex,
  Species,
} from "@/types/patient";
import { clientMatchesQuery } from "@/utils/client-fields";
import { cn } from "@/utils/cn";
import { formatPhone } from "@/utils/formatPhone";
import {
  allergyStatusOptions,
  birthDateError,
  breedOptions,
  handlingOptions,
  infoSourceOptions,
  microchipError,
  normalizeMicrochip,
  reproductiveOptions,
  severityOptions,
  speciesOptions,
  weightProblem,
} from "@/utils/patient-fields";
import { Calendar, Camera, PawPrint, Scale, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

function ownerLine(client: Client) {
  const document = client.documentNumber?.trim();
  const identity = document
    ? `${client.documentType ? `${client.documentType} ` : ""}${document}`
    : "Sin documento";
  const phone = client.phone?.trim();
  return `${identity} · ${phone ? formatPhone(phone) : "Sin teléfono"}`;
}

type AgeMode = "exacta" | "aproximada" | "desconocida";

type AllergyDraft = {
  key: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity | "";
  status: AllergyStatus;
};

type NamedDraft = { key: string; primary: string; detail: string; severity: AllergySeverity | "" };

type Draft = {
  clientId: string;
  clientQuery: string;
  name: string;
  altName: string;
  species: Species;
  breed: string;
  customBreed: string;
  sex: Sex | "";
  coat: string;
  photoUrl: string;
  noMicrochip: boolean;
  microchip: string;
  microchipImplantedOn: string;
  microchipPlace: string;
  ageMode: AgeMode;
  birthDate: string;
  ageYears: string;
  ageMonths: string;
  reproductiveStatus: ReproductiveStatus;
  sterilizedOn: string;
  sterilizationProcedure: string;
  weight: string;
  measuredAt: string;
  confirmExtreme: boolean;
  allergies: AllergyDraft[];
  reactions: NamedDraft[];
  conditions: NamedDraft[];
  handling: HandlingAlert[];
  safetyNotes: string;
  infoSource: InfoSource | "";
};

function emptyDraft(clientId = ""): Draft {
  return {
    clientId,
    clientQuery: "",
    name: "",
    altName: "",
    species: "perro",
    breed: "",
    customBreed: "",
    sex: "",
    coat: "",
    photoUrl: "",
    noMicrochip: false,
    microchip: "",
    microchipImplantedOn: "",
    microchipPlace: "",
    ageMode: "desconocida",
    birthDate: "",
    ageYears: "",
    ageMonths: "",
    reproductiveStatus: "desconocido",
    sterilizedOn: "",
    sterilizationProcedure: "",
    weight: "",
    measuredAt: localNow(),
    confirmExtreme: false,
    allergies: [],
    reactions: [],
    conditions: [],
    handling: [],
    safetyNotes: "",
    infoSource: "",
  };
}

function localNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function draftKey() {
  return Math.random().toString(36).slice(2, 10);
}

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const max = 480;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo leer la foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.72);
  if (url.length > 180_000) throw new Error("La foto es muy pesada. Prueba con otra.");
  return url;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (patient: Patient) => void;
  defaultClientId?: string;
};

export function PatientForm({ open, onClose, onCreated, defaultClientId }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultClientId));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const [forceName, setForceName] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const clients = clientsService.getClients();
  const selected = clients.find((client) => client.id === draft.clientId);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft(defaultClientId));
    setSubmitted(false);
    setSaving(false);
    setError("");
    setDuplicates([]);
    setForceName(false);
    setRegisterOpen(false);
  }, [open, defaultClientId]);

  useEffect(() => {
    if (!open) return;
    const chip = draft.noMicrochip ? "" : normalizeMicrochip(draft.microchip);
    const name = draft.name.trim();
    if (chip.length < 15 && (name.length < 2 || !draft.clientId)) {
      setDuplicates([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void patientsService
        .findPossibleDuplicates({
          microchip: chip.length === 15 ? chip : undefined,
          name,
          species: draft.species,
          clientId: draft.clientId,
        })
        .then(setDuplicates)
        .catch(() => setDuplicates([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, draft.noMicrochip, draft.microchip, draft.name, draft.species, draft.clientId]);

  const patch = (next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setError("");
  };

  const chipHits = duplicates.filter(
    (patient) => normalizeMicrochip(patient.microchip) === normalizeMicrochip(draft.microchip),
  );
  const nameHits = duplicates.filter(
    (patient) =>
      !chipHits.some((item) => item.id === patient.id) &&
      patient.clientId === draft.clientId &&
      patient.species === draft.species,
  );
  const matches = draft.clientQuery.trim().length < 2
    ? []
    : clients.filter((client) => clientMatchesQuery(client, draft.clientQuery)).slice(0, 6);

  const breedValue = draft.breed === "Otra" ? draft.customBreed.trim() : draft.breed;
  const weightValue = Number(draft.weight);
  const weightMessage =
    draft.weight.trim() && submitted
      ? weightProblem(draft.species, weightValue, draft.confirmExtreme)
      : draft.weight.trim()
        ? weightProblem(draft.species, weightValue, true).includes("plausible") ||
          weightProblem(draft.species, weightValue, true).includes("mayor")
          ? weightProblem(draft.species, weightValue, true)
          : ""
        : "";
  const extreme =
    Boolean(draft.weight.trim()) &&
    !weightProblem(draft.species, weightValue, true) &&
    Boolean(weightProblem(draft.species, weightValue, false));

  const firstProblem = () => {
    if (draft.name.trim().length < 2) return "Escribe el nombre de la mascota.";
    if (!draft.clientId) return "Elige al tutor.";
    if (draft.sex !== "macho" && draft.sex !== "hembra") return "Elige el sexo.";
    if (!draft.noMicrochip) {
      const chip = microchipError(draft.microchip);
      if (chip) return chip;
      if (chipHits.length) return "Ese microchip ya está asociado a otro paciente.";
    }
    if (draft.ageMode === "exacta") {
      if (!draft.birthDate) return "Escribe la fecha o marca la edad como aproximada.";
      const born = birthDateError(draft.birthDate);
      if (born) return born;
    }
    if (draft.ageMode === "aproximada") {
      const years = Number(draft.ageYears || 0);
      const months = Number(draft.ageMonths || 0);
      if ((!years && !months) || years < 0 || years > 40 || months < 0 || months > 11) {
        return "Revisa la edad aproximada.";
      }
    }
    if (!draft.noMicrochip && draft.microchipImplantedOn && birthDateError(draft.microchipImplantedOn)) {
      return "La fecha de implantación no puede ser futura.";
    }
    if (draft.reproductiveStatus === "esterilizado" && draft.sterilizedOn && birthDateError(draft.sterilizedOn)) {
      return "La fecha de esterilización no puede ser futura.";
    }
    if (draft.weight.trim()) {
      const problem = weightProblem(draft.species, weightValue, draft.confirmExtreme);
      if (problem) return problem;
    }
    if (nameHits.length && !forceName) {
      return "Este tutor ya tiene una mascota con ese nombre y esa especie.";
    }
    for (const allergy of draft.allergies) {
      if (!allergy.substance.trim()) return "Cada alergia necesita la sustancia, o quítala.";
    }
    for (const reaction of draft.reactions) {
      if (!reaction.primary.trim()) return "Cada reacción necesita el producto, o quítala.";
    }
    for (const condition of draft.conditions) {
      if (!condition.primary.trim()) return "Cada condición necesita un nombre, o quítala.";
    }
    return "";
  };

  const save = async () => {
    setSubmitted(true);
    const problem = firstProblem();
    if (problem || (draft.sex !== "macho" && draft.sex !== "hembra")) {
      setError(problem || "Elige el sexo.");
      return;
    }
    const sex = draft.sex;
    setSaving(true);
    setError("");
    try {
      const created = await patientsService.createPatient({
        name: draft.name.trim(),
        altName: draft.altName.trim(),
        species: draft.species,
        breed: breedValue,
        sex,
        coat: draft.coat.trim(),
        photoUrl: draft.photoUrl || undefined,
        clientId: draft.clientId,
        microchip: draft.noMicrochip ? null : normalizeMicrochip(draft.microchip) || null,
        microchipImplantedOn: draft.noMicrochip ? undefined : draft.microchipImplantedOn || undefined,
        microchipPlace: draft.noMicrochip ? "" : draft.microchipPlace.trim(),
        birthDate: draft.ageMode === "exacta" ? draft.birthDate : undefined,
        birthIsEstimated: draft.ageMode === "aproximada",
        ageYears: draft.ageMode === "aproximada" ? Number(draft.ageYears || 0) : undefined,
        ageMonths: draft.ageMode === "aproximada" ? Number(draft.ageMonths || 0) : undefined,
        reproductiveStatus: draft.reproductiveStatus,
        sterilizedOn: draft.reproductiveStatus === "esterilizado" ? draft.sterilizedOn : undefined,
        sterilizationProcedure:
          draft.reproductiveStatus === "esterilizado" ? draft.sterilizationProcedure.trim() : undefined,
        weight: draft.weight.trim() ? weightValue : undefined,
        measuredAt: draft.weight.trim() ? new Date(draft.measuredAt).toISOString() : undefined,
        confirmExtremeWeight: draft.confirmExtreme,
        confirmedAllergies: draft.allergies.map((item) => ({
          substance: item.substance.trim(),
          reaction: item.reaction.trim(),
          severity: item.severity,
          status: item.status,
        })),
        adverseReactions: draft.reactions.map((item) => ({
          product: item.primary.trim(),
          reaction: item.detail.trim(),
          severity: item.severity,
        })),
        chronicConditions: draft.conditions.map((item) => ({
          name: item.primary.trim(),
          notes: item.detail.trim(),
        })),
        handlingAlerts: draft.handling,
        safetyNotes: draft.safetyNotes.trim(),
        infoSource: draft.infoSource,
      });
      toast("✓ Paciente creado correctamente");
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !registerOpen}
        onClose={onClose}
        title="Nuevo paciente"
        size="wide"
        footer={
          <>
            <p className={cn("mr-auto text-xs", error ? "text-danger" : "text-muted")}>
              {error || "Obligatorios: nombre, especie y tutor. El identificador interno se asigna al guardar."}
            </p>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              form="patient-form"
              type="submit"
              disabled={saving || (!draft.noMicrochip && chipHits.length > 0)}
            >
              {saving ? "Guardando…" : "Guardar paciente"}
            </Button>
          </>
        }
      >
        <form
          id="patient-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-6"
        >
          <p className="text-sm leading-relaxed text-muted">
            Registra lo necesario para reconocer a la mascota y lo que la siguiente consulta tiene
            que ver. La historia, las vacunas y los signos vitales se completan en su módulo.
          </p>

          <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Quién es</p>
          <Section icon={<UserRound className="h-4 w-4" />} title="Tutor" hint="Sale del padrón de clientes.">
            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">{selected.name}</span>
                  <span className="text-xs text-muted">{ownerLine(selected)}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => patch({ clientId: "" })}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  label="Buscar tutor"
                  value={draft.clientQuery}
                  placeholder="Nombre, teléfono o documento"
                  onChange={(event) => patch({ clientQuery: event.target.value })}
                />
                {matches.length > 0 ? (
                  <ul className="overflow-hidden rounded-xl border border-border">
                    {matches.map((client) => (
                      <li key={client.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background"
                          onClick={() => patch({ clientId: client.id, clientQuery: "" })}
                        >
                          <span>{client.name}</span>
                          <span className="text-xs text-muted">{ownerLine(client)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>
              Registrar tutor
            </Button>
          </Section>

          <Section
            icon={<PawPrint className="h-4 w-4" />}
            title="Identificación"
            hint="El código PL- se genera solo. No es el microchip."
          >
            <PhotoField
              photoUrl={draft.photoUrl}
              onPick={(file) => {
                void compressPhoto(file)
                  .then((photoUrl) => patch({ photoUrl }))
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : "No se pudo leer la foto."),
                  );
              }}
              onClear={() => patch({ photoUrl: "" })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                required
                value={draft.name}
                error={submitted && draft.name.trim().length < 2 ? "Escribe el nombre de la mascota." : undefined}
                onChange={(event) => patch({ name: event.target.value })}
              />
              <Input
                label="Nombre alternativo"
                value={draft.altName}
                placeholder="Apodo o nombre anterior"
                onChange={(event) => patch({ altName: event.target.value })}
              />
              <Select
                label="Especie"
                options={speciesOptions}
                value={draft.species}
                onChange={(event) =>
                  patch({ species: event.target.value as Species, breed: "", customBreed: "" })
                }
              />
              <Select
                label="Raza"
                options={[{ value: "", label: "Sin indicar" }, ...breedOptions(draft.species)]}
                value={draft.breed}
                onChange={(event) => patch({ breed: event.target.value })}
              />
              {draft.breed === "Otra" ? (
                <div className="sm:col-span-2">
                  <Input
                    label="¿Cuál raza?"
                    value={draft.customBreed}
                    onChange={(event) => patch({ customBreed: event.target.value })}
                  />
                </div>
              ) : null}
              <Select
                label="Sexo"
                placeholder="Elige el sexo"
                options={sexOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={draft.sex}
                onChange={(event) => patch({ sex: event.target.value as Sex })}
              />
              <Input
                label="Color y señas"
                value={draft.coat}
                placeholder="Manchas, cicatrices, marcas"
                onChange={(event) => patch({ coat: event.target.value })}
              />
            </div>
            {nameHits.length > 0 ? (
              <Notice
                title="Este tutor ya tiene una mascota parecida."
                patients={nameHits}
                action={
                  <Button type="button" size="sm" variant="outline" onClick={() => setForceName(true)}>
                    {forceName ? "Confirmado" : "Crear de todos modos"}
                  </Button>
                }
              />
            ) : null}
          </Section>

          <Section icon={<Calendar className="h-4 w-4" />} title="Edad" hint="Si no se conoce el día, no lo inventes.">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["exacta", "Fecha exacta"],
                  ["aproximada", "Edad aproximada"],
                  ["desconocida", "No se conoce"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ ageMode: value })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    draft.ageMode === value
                      ? "border-primary bg-primary-light font-medium text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {draft.ageMode === "exacta" ? (
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={draft.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                error={submitted ? birthDateError(draft.birthDate) : undefined}
                onChange={(event) => patch({ birthDate: event.target.value })}
              />
            ) : null}
            {draft.ageMode === "aproximada" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Años"
                  inputMode="numeric"
                  value={draft.ageYears}
                  onChange={(event) => patch({ ageYears: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
                <Input
                  label="Meses"
                  inputMode="numeric"
                  value={draft.ageMonths}
                  onChange={(event) => patch({ ageMonths: event.target.value.replace(/\D/g, "").slice(0, 2) })}
                />
                <p className="text-xs text-muted sm:col-span-2">
                  Se mostrará como edad aproximada, no como una fecha confirmada.
                </p>
              </div>
            ) : null}
          </Section>

          <Section
            icon={<PawPrint className="h-4 w-4" />}
            title="Microchip"
            hint="Opcional. Si no tiene, márcalo y estos campos quedan bloqueados."
          >
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-primary"
                checked={draft.noMicrochip}
                onChange={(event) =>
                  patch({
                    noMicrochip: event.target.checked,
                    microchip: "",
                    microchipImplantedOn: "",
                    microchipPlace: "",
                  })
                }
              />
              <span>
                <span className="font-medium">No tiene microchip</span>
                <span className="mt-0.5 block text-xs text-muted">
                  No es necesario para el alta.
                </span>
              </span>
            </label>
            <div className={cn("grid gap-4 sm:grid-cols-2", draft.noMicrochip && "pointer-events-none opacity-50")}>
              <Input
                label="Microchip"
                inputMode="numeric"
                disabled={draft.noMicrochip}
                value={draft.microchip}
                error={!draft.noMicrochip && submitted ? microchipError(draft.microchip) : undefined}
                onChange={(event) =>
                  patch({ microchip: event.target.value.replace(/\D/g, "").slice(0, 15) })
                }
              />
              <Input
                label="Fecha de implantación"
                type="date"
                disabled={draft.noMicrochip}
                value={draft.microchipImplantedOn}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => patch({ microchipImplantedOn: event.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Lugar de implantación"
                  disabled={draft.noMicrochip}
                  value={draft.microchipPlace}
                  placeholder="Si se conoce"
                  onChange={(event) => patch({ microchipPlace: event.target.value })}
                />
              </div>
            </div>
            {!draft.noMicrochip && chipHits.length > 0 ? (
              <Notice title="Ese microchip ya está asociado a otro paciente." patients={chipHits} />
            ) : null}
          </Section>
          </div>

          <div className="space-y-8 lg:border-l lg:border-border lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Qué debe saber la clínica</p>
          <Section
            icon={<PawPrint className="h-4 w-4" />}
            title="Reproducción"
            hint="El sexo no dice si está esterilizado."
          >
            <div className="flex flex-wrap gap-2">
              {reproductiveOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => patch({ reproductiveStatus: option.value })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    draft.reproductiveStatus === option.value
                      ? "border-primary bg-primary-light font-medium text-primary"
                      : "border-border text-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {draft.reproductiveStatus === "esterilizado" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Fecha del procedimiento"
                  type="date"
                  value={draft.sterilizedOn}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => patch({ sterilizedOn: event.target.value })}
                />
                <Input
                  label="Procedimiento"
                  value={draft.sterilizationProcedure}
                  placeholder="Si se conoce"
                  onChange={(event) => patch({ sterilizationProcedure: event.target.value })}
                />
              </div>
            ) : null}
          </Section>

          <Section icon={<Scale className="h-4 w-4" />} title="Peso" hint="Es una medición de hoy, no un dato fijo.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Peso (kg)"
                inputMode="decimal"
                value={draft.weight}
                error={weightMessage || undefined}
                onChange={(event) => patch({ weight: event.target.value, confirmExtreme: false })}
              />
              <Input
                label="Fecha y hora"
                type="datetime-local"
                value={draft.measuredAt}
                onChange={(event) => patch({ measuredAt: event.target.value })}
              />
            </div>
            {extreme ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-primary"
                  checked={draft.confirmExtreme}
                  onChange={(event) => patch({ confirmExtreme: event.target.checked })}
                />
                <span>Confirmo este peso. Es alto para la especie, pero es el que se midió.</span>
              </label>
            ) : null}
          </Section>

          <Section
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Seguridad clínica"
            hint="Una sospecha no se guarda como alergia confirmada."
          >
            <Block title="Alergias">
              {draft.allergies.map((item, index) => (
                <RowCard
                  key={item.key}
                  title={`Alergia ${index + 1}`}
                  onRemove={() => patch({ allergies: draft.allergies.filter((row) => row.key !== item.key) })}
                >
                  <Input
                    label="Sustancia"
                    value={item.substance}
                    onChange={(event) =>
                      patch({
                        allergies: draft.allergies.map((row) =>
                          row.key === item.key ? { ...row, substance: event.target.value } : row,
                        ),
                      })
                    }
                  />
                  <Input
                    label="Reacción"
                    value={item.reaction}
                    onChange={(event) =>
                      patch({
                        allergies: draft.allergies.map((row) =>
                          row.key === item.key ? { ...row, reaction: event.target.value } : row,
                        ),
                      })
                    }
                  />
                  <Select
                    label="Gravedad"
                    options={[{ value: "", label: "Sin indicar" }, ...severityOptions]}
                    value={item.severity}
                    onChange={(event) =>
                      patch({
                        allergies: draft.allergies.map((row) =>
                          row.key === item.key
                            ? { ...row, severity: event.target.value as AllergySeverity | "" }
                            : row,
                        ),
                      })
                    }
                  />
                  <Select
                    label="Estado"
                    options={allergyStatusOptions}
                    value={item.status}
                    onChange={(event) =>
                      patch({
                        allergies: draft.allergies.map((row) =>
                          row.key === item.key
                            ? { ...row, status: event.target.value as AllergyStatus }
                            : row,
                        ),
                      })
                    }
                  />
                </RowCard>
              ))}
              <AddButton
                label="Agregar alergia"
                onClick={() =>
                  patch({
                    allergies: [
                      ...draft.allergies,
                      { key: draftKey(), substance: "", reaction: "", severity: "", status: "confirmada" },
                    ],
                  })
                }
              />
            </Block>

            <Block title="Reacciones adversas previas">
              {draft.reactions.map((item, index) => (
                <NamedRow
                  key={item.key}
                  index={index}
                  title="Reacción"
                  primaryLabel="Producto"
                  detailLabel="Qué pasó"
                  item={item}
                  onChange={(next) =>
                    patch({
                      reactions: draft.reactions.map((row) => (row.key === item.key ? { ...row, ...next } : row)),
                    })
                  }
                  onRemove={() => patch({ reactions: draft.reactions.filter((row) => row.key !== item.key) })}
                />
              ))}
              <AddButton
                label="Agregar reacción"
                onClick={() =>
                  patch({
                    reactions: [...draft.reactions, { key: draftKey(), primary: "", detail: "", severity: "" }],
                  })
                }
              />
            </Block>

            <Block title="Condiciones relevantes">
              {draft.conditions.map((item) => (
                <NamedRow
                  key={item.key}
                  index={0}
                  title="Condición"
                  primaryLabel="Nombre"
                  detailLabel="Contexto"
                  item={item}
                  showSeverity={false}
                  onChange={(next) =>
                    patch({
                      conditions: draft.conditions.map((row) => (row.key === item.key ? { ...row, ...next } : row)),
                    })
                  }
                  onRemove={() =>
                    patch({ conditions: draft.conditions.filter((row) => row.key !== item.key) })
                  }
                />
              ))}
              <AddButton
                label="Agregar condición"
                onClick={() =>
                  patch({
                    conditions: [...draft.conditions, { key: draftKey(), primary: "", detail: "", severity: "" }],
                  })
                }
              />
            </Block>

            <div>
              <p className="text-sm font-medium">Alertas de manejo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {handlingOptions.map((option) => {
                  const pressed = draft.handling.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() =>
                        patch({
                          handling: pressed
                            ? draft.handling.filter((item) => item !== option.value)
                            : [...draft.handling, option.value],
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        pressed
                          ? "border-primary bg-primary-light font-medium text-primary"
                          : "border-border text-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-sm font-medium">
              Notas de seguridad
              <textarea
                value={draft.safetyNotes}
                rows={3}
                onChange={(event) => patch({ safetyNotes: event.target.value })}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <Select
              label="¿De dónde salió esta información?"
              options={infoSourceOptions}
              value={draft.infoSource}
              onChange={(event) => patch({ infoSource: event.target.value as InfoSource | "" })}
            />
          </Section>
          </div>
          </div>
        </form>
      </Modal>
      <ClientForm
        open={registerOpen}
        allowPetIntake={false}
        onClose={() => setRegisterOpen(false)}
        onCreated={async (client) => {
          setRegisterOpen(false);
          patch({ clientId: client.id, clientQuery: "" });
          toast("✓ Tutor registrado");
        }}
      />
    </>
  );
}

function PhotoField({
  photoUrl,
  onPick,
  onClear,
}: {
  photoUrl: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface text-muted"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Foto de la mascota" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium">Foto de la mascota</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Opcional. Sirve para reconocerla en recepción y en la consulta.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {photoUrl ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {photoUrl ? (
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
          {icon}
        </span>
        <span>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs leading-relaxed text-muted">{hint}</p>
        </span>
      </div>
      {children}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}

function RowCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Quitar
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function NamedRow({
  title,
  primaryLabel,
  detailLabel,
  item,
  showSeverity = true,
  onChange,
  onRemove,
}: {
  index: number;
  title: string;
  primaryLabel: string;
  detailLabel: string;
  item: NamedDraft;
  showSeverity?: boolean;
  onChange: (next: Partial<NamedDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <RowCard title={title} onRemove={onRemove}>
      <Input label={primaryLabel} value={item.primary} onChange={(event) => onChange({ primary: event.target.value })} />
      <Input label={detailLabel} value={item.detail} onChange={(event) => onChange({ detail: event.target.value })} />
      {showSeverity ? (
        <Select
          label="Gravedad"
          options={[{ value: "", label: "Sin indicar" }, ...severityOptions]}
          value={item.severity}
          onChange={(event) => onChange({ severity: event.target.value as AllergySeverity | "" })}
        />
      ) : null}
    </RowCard>
  );
}

function Notice({
  title,
  patients,
  action,
}: {
  title: string;
  patients: Patient[];
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-warning bg-warning-light/50 px-3 py-3 text-sm">
      <p className="font-medium text-warning">{title}</p>
      <ul className="mt-2 space-y-1">
        {patients.map((patient) => (
          <li key={patient.id}>
            {patient.name}
            {patient.code ? ` · ${patient.code}` : ""}
          </li>
        ))}
      </ul>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
