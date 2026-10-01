import { appointments as seedAppointments } from "@/data/mock/appointments";
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from "@/types/appointment";
import { followUpsService } from "@/services/follow-ups.service";

let appointmentsStore: Appointment[] = [...seedAppointments];

const BUSY_STATUSES: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "llego",
  "en_consulta",
];

/** El flujo normal solo avanza. Cancelar y no asistir son salidas, no retrocesos. */
const FORWARD_FLOW: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "llego",
  "en_consulta",
  "atendida",
  "pagada",
];

function canMoveForward(from: AppointmentStatus, to: AppointmentStatus) {
  if (to === "cancelada" || to === "no_asistio") {
    return from === "programada" || from === "confirmada" || from === "llego";
  }
  const current = FORWARD_FLOW.indexOf(from);
  const next = FORWARD_FLOW.indexOf(to);
  return current !== -1 && next > current;
}

function stepBack(status: AppointmentStatus): AppointmentStatus | undefined {
  const index = FORWARD_FLOW.indexOf(status);
  if (index <= 0) return undefined;
  return FORWARD_FLOW[index - 1];
}

export const appointmentsService = {
  getAppointments(): Appointment[] {
    return [...appointmentsStore].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
  },

  getAppointmentById(id: string): Appointment | undefined {
    return appointmentsStore.find((a) => a.id === id);
  },

  getAppointmentsByDate(date: string): Appointment[] {
    return this.getAppointments().filter((a) => a.date === date);
  },

  getAppointmentsByPatientId(patientId: string): Appointment[] {
    return appointmentsStore.filter((a) => a.patientId === patientId);
  },

  getAppointmentsByVeterinarian(
    veterinarianId: string,
    date?: string,
  ): Appointment[] {
    return this.getAppointments().filter(
      (a) =>
        a.veterinarianId === veterinarianId && (!date || a.date === date),
    );
  },

  isSlotTaken(
    veterinarianId: string,
    date: string,
    time: string,
    excludeId?: string,
  ): boolean {
    return appointmentsStore.some(
      (a) =>
        a.id !== excludeId &&
        a.veterinarianId === veterinarianId &&
        a.date === date &&
        a.time === time &&
        BUSY_STATUSES.includes(a.status),
    );
  },

  createAppointment(data: CreateAppointmentInput): Appointment {
    if (this.isSlotTaken(data.veterinarianId, data.date, data.time)) {
      throw new Error("El veterinario ya tiene una cita en ese horario.");
    }
    const appointment: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      status: data.status ?? "programada",
    };
    appointmentsStore = [appointment, ...appointmentsStore];
    return appointment;
  },

  updateAppointment(
    id: string,
    data: Partial<Appointment>,
  ): Appointment | undefined {
    const index = appointmentsStore.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    appointmentsStore[index] = { ...appointmentsStore[index], ...data, id };
    return appointmentsStore[index];
  },

  updateStatus(id: string, status: AppointmentStatus): Appointment | undefined {
    const current = this.getAppointmentById(id);
    if (!current || !canMoveForward(current.status, status)) return undefined;

    const updated = this.updateAppointment(id, {
      status,
      statusBefore: current.status,
    });
    if (updated && status === "no_asistio") {
      followUpsService.createFollowUp({
        patientId: updated.patientId,
        clientId: updated.clientId,
        type: "no_show",
        title: `Reprogramar cita no asistida`,
        dueDate: updated.date,
        relatedId: updated.id,
        status: "pendiente",
      });
    }
    return updated;
  },

  /**
   * Estado al que se puede volver para corregir un error.
   * Un solo paso, el inmediatamente anterior. Una cita cobrada no se revierte aquí.
   */
  getCorrectionTarget(appointment: Appointment): AppointmentStatus | undefined {
    if (appointment.status === "pagada" || appointment.saleId) return undefined;
    if (appointment.status === "programada") return undefined;
    return appointment.statusBefore ?? stepBack(appointment.status);
  },

  correctLastStep(id: string): Appointment | undefined {
    const current = this.getAppointmentById(id);
    if (!current) return undefined;
    const target = this.getCorrectionTarget(current);
    if (!target) return undefined;
    return this.updateAppointment(id, {
      status: target,
      statusBefore: undefined,
    });
  },

  getTodayStats(date: string) {
    const today = this.getAppointmentsByDate(date);
    return {
      total: today.length,
      atendidas: today.filter((a) =>
        ["atendida", "pagada"].includes(a.status),
      ).length,
      canceladas: today.filter((a) => a.status === "cancelada").length,
      noAsistieron: today.filter((a) => a.status === "no_asistio").length,
      pendientes: today.filter((a) =>
        ["programada", "confirmada", "llego", "en_consulta"].includes(a.status),
      ).length,
      esperando: today.filter((a) => a.status === "llego").length,
      noConfirmadas: today.filter((a) => a.status === "programada").length,
    };
  },
};
