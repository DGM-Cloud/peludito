"use client";

import { MedicalRecordForm } from "@/components/medical-records/MedicalRecordForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { medicalRecordStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { appointmentsService } from "@/services/appointments.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type {
  CreateMedicalRecordInput,
  MedicalRecord,
} from "@/types/medical-record";
import { formatDate } from "@/utils/formatDate";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function MedicalRecordsView() {
  const { version, refresh } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useModal();
  const [query, setQuery] = useState("");
  const [manualEdit, setManualEdit] = useState<MedicalRecord | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const records = useMemo(
    () => medicalRecordsService.getMedicalRecords(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const recordId = searchParams.get("record");
  const patientId = searchParams.get("patient");
  const appointmentId = searchParams.get("appointment");

  const urlRecord = recordId
    ? medicalRecordsService.getMedicalRecordById(recordId)
    : null;
  const urlApt = appointmentId
    ? appointmentsService.getAppointmentById(appointmentId)
    : null;

  const urlPrefills = urlApt
    ? {
        patientId: urlApt.patientId,
        vetId: urlApt.veterinarianId,
        reason: urlApt.reason,
      }
    : patientId
      ? { patientId }
      : {};

  const editing = manualEdit ?? urlRecord ?? null;
  const open =
    manualOpen ||
    modal.open ||
    Boolean(urlRecord) ||
    Boolean(urlApt) ||
    Boolean(patientId);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return records.filter((r) => {
      const patient = patientsService.getPatientById(r.patientId);
      return (
        !q ||
        patient?.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q)
      );
    });
  }, [records, query]);

  const closeAndClear = () => {
    modal.closeModal();
    setManualEdit(null);
    setManualOpen(false);
    if (searchParams.toString()) {
      router.replace("/medical-records");
    }
  };

  const handleCreate = (data: CreateMedicalRecordInput) => {
    medicalRecordsService.createMedicalRecord(data);
    patientsService.updatePatient(data.patientId, { lastVisit: data.date });
    refresh();
  };

  const handleUpdate = (id: string, data: Partial<MedicalRecord>) => {
    const updated = medicalRecordsService.updateMedicalRecord(id, data);
    if (updated) {
      patientsService.updatePatient(updated.patientId, {
        lastVisit: updated.date,
      });
    }
    refresh();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar por mascota, motivo o diagnóstico…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar historias"
        />
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setManualEdit(null);
            setManualOpen(true);
            modal.openModal();
          }}
        >
          Nueva consulta
        </Button>
      </div>

      <Card padding={false}>
        <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Mascota</TH>
                <TH>Veterinario</TH>
                <TH>Motivo</TH>
                <TH>Diagnóstico</TH>
                <TH>Estado</TH>
                <TH>
                  <span className="sr-only">Acciones</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => {
                const patient = patientsService.getPatientById(r.patientId);
                const vet = veterinariansService.getVeterinarianById(
                  r.veterinarianId,
                );
                const status = medicalRecordStatuses.find(
                  (s) => s.value === r.status,
                );
                return (
                  <TR key={r.id}>
                    <TD>{formatDate(r.date)}</TD>
                    <TD className="font-medium">{patient?.name}</TD>
                    <TD>{vet?.name}</TD>
                    <TD>{r.reason}</TD>
                    <TD>{r.diagnosis || "—"}</TD>
                    <TD>
                      <StatusBadge
                        label={status?.label ?? r.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "primary") ?? "default"
                        }
                      />
                    </TD>
                    <TD>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setManualEdit(r);
                          setManualOpen(true);
                          modal.openModal();
                        }}
                      >
                        {r.status === "abierta" ? "Completar" : "Ver / editar"}
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {filtered.map((r) => {
            const patient = patientsService.getPatientById(r.patientId);
            const status = medicalRecordStatuses.find(
              (s) => s.value === r.status,
            );
            return (
              <button
                key={r.id}
                type="button"
                className="w-full px-4 py-4 text-left hover:bg-background"
                onClick={() => {
                  setManualEdit(r);
                  setManualOpen(true);
                  modal.openModal();
                }}
              >
                <p className="font-medium">{patient?.name}</p>
                <p className="text-sm text-muted">
                  {formatDate(r.date)} · {r.reason}
                </p>
                <div className="mt-2">
                  <StatusBadge
                    label={status?.label ?? r.status}
                    tone={
                      (status?.color as "success" | "warning" | "primary") ??
                      "default"
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <MedicalRecordForm
        key={
          editing?.id ??
          `new-${urlPrefills.patientId ?? ""}-${urlPrefills.reason ?? ""}-${open}`
        }
        open={open}
        onClose={closeAndClear}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
        initial={editing}
        lockedPatientId={urlPrefills.patientId}
        lockedVetId={urlPrefills.vetId}
        defaultReason={urlPrefills.reason}
      />
    </>
  );
}
