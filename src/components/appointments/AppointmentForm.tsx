"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { catalogServices } from "@/config/demo";
import { serviceTypeOptions } from "@/data/constants/categories";
import { useDemo } from "@/context/DemoProvider";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { appointmentsService } from "@/services/appointments.service";
import type {
  AppointmentServiceType,
  CreateAppointmentInput,
} from "@/types/appointment";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAppointmentInput) => void;
  defaultDate?: string;
  defaultClientId?: string;
  defaultPatientId?: string;
};

export function AppointmentForm({
  open,
  onClose,
  onSubmit,
  defaultDate,
  defaultClientId,
  defaultPatientId,
}: Props) {
  const { toast } = useToast();
  const { clinicId } = useDemo();
  const clients = clientsService.getClients();
  const vets = veterinariansService.getVeterinarians();

  const initialClient =
    defaultClientId ?? clients[0]?.id ?? "";
  const initialPets = patientsService.getPatientsByClientId(initialClient);

  const [clientId, setClientId] = useState(initialClient);
  const pets = useMemo(
    () => patientsService.getPatientsByClientId(clientId),
    [clientId],
  );
  const [patientId, setPatientId] = useState(
    defaultPatientId ?? initialPets[0]?.id ?? "",
  );
  const [veterinarianId, setVeterinarianId] = useState(vets[0]?.id ?? "");
  const [serviceType, setServiceType] =
    useState<AppointmentServiceType>("consulta");
  const [date, setDate] = useState(defaultDate ?? "2026-09-22");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const slotTaken = appointmentsService.isSlotTaken(
    veterinarianId,
    date,
    time,
  );

  const handleClientChange = (id: string) => {
    setClientId(id);
    const nextPets = patientsService.getPatientsByClientId(id);
    setPatientId(nextPets[0]?.id ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!patientId || !clientId || !reason) {
      setError("Completa los campos obligatorios.");
      return;
    }
    if (slotTaken) {
      setError("El veterinario ya tiene una cita en ese horario.");
      return;
    }
    try {
      onSubmit({
        patientId,
        clientId,
        veterinarianId,
        clinicId,
        date,
        time,
        reason: reason || catalogServices.find((s) => s.category === serviceType)?.name || reason,
        serviceType,
        notes: notes || undefined,
        status: "programada",
      });
      toast("✓ Cita creada correctamente");
      onClose();
      setReason("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cita");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva cita"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="appointment-form" disabled={slotTaken}>
            Confirmar cita
          </Button>
        </>
      }
    >
      <form
        id="appointment-form"
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Select
          label="Cliente"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
        />
        <Select
          label="Mascota"
          options={
            pets.length
              ? pets.map((p) => ({ value: p.id, label: p.name }))
              : [{ value: "", label: "Sin mascotas" }]
          }
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <Select
          label="Servicio"
          options={serviceTypeOptions.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          value={serviceType}
          onChange={(e) =>
            setServiceType(e.target.value as AppointmentServiceType)
          }
        />
        <Select
          label="Veterinario"
          options={vets.map((v) => ({ value: v.id, label: v.name }))}
          value={veterinarianId}
          onChange={(e) => setVeterinarianId(e.target.value)}
        />
        <Input
          label="Fecha"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="Hora"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          error={slotTaken ? "Horario ocupado para este veterinario" : undefined}
        />
        <div className="sm:col-span-2">
          <Input
            label="Motivo"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Control, vacunación…"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error ? (
          <p className="sm:col-span-2 text-sm text-danger">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
