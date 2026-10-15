import { api } from "@/lib/api";
import { readSnapshot, rememberAppointment } from "@/lib/clinic-cache";
import { correctionTarget, rangesOverlap, toMinutes } from "@/server/domain";
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from "@/types/appointment";

const BUSY = ["programada", "confirmada", "llego", "en_consulta"];

export const appointmentsService = {
  getAppointments(): Appointment[] {
    return [...readSnapshot().appointments].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
  },

  getAppointmentById(id: string): Appointment | undefined {
    return this.getAppointments().find((item) => item.id === id);
  },

  getAppointmentsByDate(date: string): Appointment[] {
    return this.getAppointments().filter((item) => item.date === date);
  },

  getAppointmentsByPatientId(patientId: string): Appointment[] {
    return this.getAppointments().filter((item) => item.patientId === patientId);
  },

  getAppointmentsByVeterinarian(veterinarianId: string, date?: string): Appointment[] {
    return this.getAppointments().filter(
      (item) =>
        item.veterinarianId === veterinarianId && (!date || item.date === date),
    );
  },

  isSlotTaken(
    veterinarianId: string,
    date: string,
    time: string,
    durationMinutes = 30,
    excludeId?: string,
    serviceType?: string,
  ): boolean {
    const start = toMinutes(time);
    const incomingGrooming = serviceType === "grooming";
    return this.getAppointments().some(
      (item) =>
        item.id !== excludeId &&
        item.veterinarianId === veterinarianId &&
        item.date.slice(0, 10) === date &&
        BUSY.includes(item.status) &&
        !(incomingGrooming && item.serviceType === "grooming") &&
        rangesOverlap(
          start,
          durationMinutes,
          toMinutes(item.time),
          item.durationMinutes || 30,
        ),
    );
  },

  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    const created = await api<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
    rememberAppointment(created);
    return created;
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const updated = await api<Appointment>(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    rememberAppointment(updated);
    return updated;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const updated = await api<Appointment>(`/appointments/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    rememberAppointment(updated);
    return updated;
  },

  getCorrectionTarget(appointment: Appointment) {
    return correctionTarget(appointment);
  },

  async correctLastStep(id: string): Promise<Appointment> {
    const updated = await api<Appointment>(`/appointments/${id}/correct`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    rememberAppointment(updated);
    return updated;
  },

  getTodayStats(date: string) {
    const today = this.getAppointmentsByDate(date);
    return {
      total: today.length,
      atendidas: today.filter((item) =>
        ["atendida", "pagada"].includes(item.status),
      ).length,
      canceladas: today.filter((item) => item.status === "cancelada").length,
      noAsistieron: today.filter((item) => item.status === "no_asistio").length,
      pendientes: today.filter((item) =>
        ["programada", "confirmada", "llego", "en_consulta"].includes(item.status),
      ).length,
      esperando: today.filter((item) => item.status === "llego").length,
      noConfirmadas: today.filter((item) => item.status === "programada").length,
    };
  },
};
