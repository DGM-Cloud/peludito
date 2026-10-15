"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type {
  CreateVaccinationInput,
  Vaccination,
  VaccinationRoute,
} from "@/types/vaccination";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const ROUTES: { value: VaccinationRoute; label: string }[] = [
  { value: "subcutanea", label: "Subcutánea" },
  { value: "intramuscular", label: "Intramuscular" },
  { value: "oral", label: "Oral" },
  { value: "nasal", label: "Nasal" },
  { value: "otra", label: "Otra" },
];

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Mode = "create" | "edit" | "booster";

type Props = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSaved: () => void;
  initial?: Vaccination | null;
  lockedPatientId?: string;
  lockedRecordId?: string;
};

export function VaccinationForm({
  open,
  mode,
  onClose,
  onSaved,
  initial,
  lockedPatientId,
  lockedRecordId,
}: Props) {
  const { toast } = useToast();
  const patients = patientsService.getPatients();
  const vets = veterinariansService.getVeterinarians();
  const catalog = vaccinationsService.getCatalog();
  const [saving, setSaving] = useState(false);

  const patientIdDefault =
    lockedPatientId ?? initial?.patientId ?? patients[0]?.id ?? "";

  const [form, setForm] = useState({
    patientId: patientIdDefault,
    catalogId: initial?.catalogId ?? "",
    name: initial?.name ?? "",
    laboratory: initial?.laboratory ?? "",
    lot: mode === "booster" ? "" : (initial?.lot ?? ""),
    lotExpiry: initial?.lotExpiry ?? "",
    dateApplied: mode === "booster" ? DEMO_TODAY : (initial?.dateApplied ?? DEMO_TODAY),
    nextDue: initial?.nextDue ?? "",
    veterinarianId: initial?.veterinarianId ?? vets[0]?.id ?? "",
    route: (initial?.route ?? "subcutanea") as VaccinationRoute,
    site: initial?.site ?? "",
    doseMl: initial?.doseMl != null ? String(initial.doseMl) : "",
    notes: initial?.notes ?? "",
    medicalRecordId: lockedRecordId ?? initial?.medicalRecordId ?? "",
    registerInHistory: true,
    customName: false,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      patientId: lockedPatientId ?? initial?.patientId ?? patients[0]?.id ?? "",
      catalogId: initial?.catalogId ?? "",
      name: initial?.name ?? "",
      laboratory: initial?.laboratory ?? "",
      lot: mode === "booster" ? "" : (initial?.lot ?? ""),
      lotExpiry: mode === "booster" ? "" : (initial?.lotExpiry ?? ""),
      dateApplied:
        mode === "booster" ? DEMO_TODAY : (initial?.dateApplied ?? DEMO_TODAY),
      nextDue: mode === "booster" ? "" : (initial?.nextDue ?? ""),
      veterinarianId: initial?.veterinarianId ?? vets[0]?.id ?? "",
      route: (initial?.route ?? "subcutanea") as VaccinationRoute,
      site: initial?.site ?? "",
      doseMl: initial?.doseMl != null ? String(initial.doseMl) : "",
      notes: initial?.notes ?? "",
      medicalRecordId: lockedRecordId ?? initial?.medicalRecordId ?? "",
      registerInHistory: !lockedRecordId,
      customName: mode === "edit" && !initial?.catalogId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial?.id, lockedPatientId, lockedRecordId]);

  const patient = patientsService.getPatientById(form.patientId);
  const catalogForPatient = useMemo(() => {
    if (!patient) return catalog;
    return catalog.filter(
      (item) =>
        item.species.length === 0 || item.species.includes(patient.species),
    );
  }, [catalog, patient]);

  const openRecords = useMemo(() => {
    if (!form.patientId) return [];
    return medicalRecordsService
      .getRecordsByPatientId(form.patientId)
      .filter((r) => r.status === "abierta" || r.status === "seguimiento");
  }, [form.patientId]);

  const applyCatalog = (catalogId: string) => {
    if (catalogId === "__custom") {
      setForm((f) => ({ ...f, catalogId: "", customName: true, name: f.name }));
      return;
    }
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    setForm((f) => ({
      ...f,
      catalogId,
      customName: false,
      name: item.name,
      laboratory: item.laboratoryHint || f.laboratory,
      nextDue: addDays(f.dateApplied, item.defaultIntervalDays),
    }));
  };

  const title =
    mode === "edit"
      ? "Editar vacuna"
      : mode === "booster"
        ? "Aplicar refuerzo"
        : "Registrar vacuna";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.lot.trim()) {
      toast("Ingresa el número de lote");
      return;
    }
    if (!form.name.trim()) {
      toast("Selecciona o escribe el nombre de la vacuna");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateVaccinationInput = {
        patientId: form.patientId,
        name: form.name.trim(),
        laboratory: form.laboratory.trim(),
        lot: form.lot.trim(),
        dateApplied: form.dateApplied,
        nextDue: form.nextDue || addDays(form.dateApplied, 365),
        veterinarianId: form.veterinarianId,
        notes: form.notes.trim() || undefined,
        catalogId: form.catalogId || null,
        lotExpiry: form.lotExpiry || null,
        route: form.route,
        site: form.site.trim() || null,
        doseMl: form.doseMl ? Number(form.doseMl) : null,
        medicalRecordId: form.medicalRecordId || null,
        registerInHistory: form.medicalRecordId
          ? false
          : form.registerInHistory,
      };

      if (mode === "edit" && initial) {
        await vaccinationsService.updateVaccination(initial.id, {
          name: payload.name,
          laboratory: payload.laboratory,
          lot: payload.lot,
          dateApplied: payload.dateApplied,
          nextDue: payload.nextDue,
          veterinarianId: payload.veterinarianId,
          notes: payload.notes,
          catalogId: payload.catalogId,
          lotExpiry: payload.lotExpiry,
          route: payload.route,
          site: payload.site,
          doseMl: payload.doseMl,
        });
        toast("✓ Vacuna actualizada");
      } else if (mode === "booster" && initial) {
        await vaccinationsService.applyBooster(initial.id, payload);
        toast("✓ Refuerzo registrado en historial");
      } else {
        await vaccinationsService.createVaccination(payload);
        toast("✓ Vacuna registrada — seguimiento creado");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="vaccination-form" disabled={saving}>
            {saving
              ? "Guardando…"
              : mode === "booster"
                ? "Registrar refuerzo"
                : "Guardar"}
          </Button>
        </>
      }
    >
      <form
        id="vaccination-form"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => void submit(e)}
      >
        <Select
          label="Paciente"
          disabled={Boolean(lockedPatientId) || mode !== "create"}
          value={form.patientId}
          options={patients.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
        />
        <Select
          label="Veterinario"
          value={form.veterinarianId}
          options={vets.map((v) => ({ value: v.id, label: v.name }))}
          onChange={(e) =>
            setForm((f) => ({ ...f, veterinarianId: e.target.value }))
          }
        />

        <Select
          label="Vacuna (catálogo)"
          className="sm:col-span-2"
          value={form.customName ? "__custom" : form.catalogId}
          options={[
            { value: "", label: "Selecciona…" },
            ...catalogForPatient.map((c) => ({
              value: c.id,
              label: `${c.name} · cada ${c.defaultIntervalDays} días`,
            })),
            { value: "__custom", label: "Otra (escribir nombre)" },
          ]}
          onChange={(e) => applyCatalog(e.target.value)}
        />

        {form.customName || !form.catalogId ? (
          <Input
            label="Nombre de la vacuna"
            className="sm:col-span-2"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        ) : null}

        <Input
          label="Laboratorio"
          value={form.laboratory}
          onChange={(e) => setForm((f) => ({ ...f, laboratory: e.target.value }))}
        />
        <Input
          label="Lote"
          required
          value={form.lot}
          onChange={(e) => setForm((f) => ({ ...f, lot: e.target.value }))}
        />
        <Input
          label="Vencimiento del lote"
          type="date"
          value={form.lotExpiry}
          onChange={(e) => setForm((f) => ({ ...f, lotExpiry: e.target.value }))}
        />
        <Select
          label="Vía"
          value={form.route}
          options={ROUTES}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              route: e.target.value as VaccinationRoute,
            }))
          }
        />
        <Input
          label="Sitio de aplicación"
          placeholder="Ej. escápula derecha"
          value={form.site}
          onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
        />
        <Input
          label="Dosis (ml)"
          inputMode="decimal"
          value={form.doseMl}
          onChange={(e) => setForm((f) => ({ ...f, doseMl: e.target.value }))}
        />
        <Input
          label="Fecha de aplicación"
          type="date"
          required
          value={form.dateApplied}
          onChange={(e) => {
            const dateApplied = e.target.value;
            const item = catalog.find((c) => c.id === form.catalogId);
            setForm((f) => ({
              ...f,
              dateApplied,
              nextDue: item
                ? addDays(dateApplied, item.defaultIntervalDays)
                : f.nextDue,
            }));
          }}
        />
        <Input
          label="Próxima dosis"
          type="date"
          required
          value={form.nextDue}
          onChange={(e) => setForm((f) => ({ ...f, nextDue: e.target.value }))}
        />
        <Input
          label="Notas clínicas"
          className="sm:col-span-2"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        {mode !== "edit" ? (
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border bg-background p-3">
            {lockedRecordId ? (
              <p className="text-sm text-muted">
                Quedará vinculada a la consulta seleccionada.
              </p>
            ) : (
              <>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.registerInHistory && !form.medicalRecordId}
                    disabled={Boolean(form.medicalRecordId)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        registerInHistory: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Registrar en historial clínico
                    <span className="mt-0.5 block text-xs text-muted">
                      Crea una entrada breve en la historia del paciente.
                    </span>
                  </span>
                </label>
                {openRecords.length > 0 ? (
                  <Select
                    label="O vincular a consulta abierta"
                    value={form.medicalRecordId}
                    options={[
                      { value: "", label: "Sin vincular a consulta abierta" },
                      ...openRecords.map((r) => ({
                        value: r.id,
                        label: `${r.date} · ${r.reason}`,
                      })),
                    ]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        medicalRecordId: e.target.value,
                        registerInHistory: !e.target.value,
                      }))
                    }
                  />
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
