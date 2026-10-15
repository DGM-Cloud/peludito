"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { appointmentsService } from "@/services/appointments.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Appointment } from "@/types/appointment";
import { useState } from "react";

type Props = {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export function TransferTratanteModal({
  appointment,
  open,
  onClose,
  onDone,
}: Props) {
  const { toast } = useToast();
  const vets = veterinariansService.getVeterinarians();
  const [vetId, setVetId] = useState("");
  const [saving, setSaving] = useState(false);

  const currentId = appointment?.veterinarianId ?? "";
  const options = vets
    .filter((v) => v.id !== currentId)
    .map((v) => ({ value: v.id, label: `${v.name} · ${v.specialty}` }));

  const effectiveVetId = vetId || options[0]?.value || "";

  const submit = async () => {
    if (!appointment || !effectiveVetId) return;
    setSaving(true);
    try {
      await appointmentsService.updateAppointment(appointment.id, {
        veterinarianId: effectiveVetId,
      });

      const recordId = appointment.medicalRecordId;
      if (recordId) {
        const record = medicalRecordsService.getMedicalRecordById(recordId);
        if (
          record &&
          (record.status === "abierta" || record.status === "seguimiento")
        ) {
          await medicalRecordsService.updateMedicalRecord(recordId, {
            veterinarianId: effectiveVetId,
          });
        }
      }

      const next = veterinariansService.getVeterinarianById(effectiveVetId);
      toast(`✓ Transferida a ${next?.name ?? "otro veterinario"}`);
      onDone();
      onClose();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo transferir el tratante.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open && Boolean(appointment)}
      onClose={onClose}
      title="Transferir tratante"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving || !effectiveVetId || options.length === 0}
          >
            {saving ? "Transfiriendo…" : "Transferir"}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        La cita pasa al nuevo médico. Si ya hay una consulta abierta o en
        seguimiento, también se mueve a su cola de Mis consultas.
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-muted">
          No hay otro veterinario disponible en esta clínica.
        </p>
      ) : (
        <Select
          label="Nuevo médico tratante"
          value={effectiveVetId}
          options={options}
          onChange={(e) => setVetId(e.target.value)}
        />
      )}
    </Modal>
  );
}
