import type { Appointment, AppointmentStatus } from "@/types/appointment";
import type { Product } from "@/types/product";
import type { Vaccination } from "@/types/vaccination";

export const BUSY_STATUSES: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "llego",
  "en_consulta",
];

const FORWARD_FLOW: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "llego",
  "en_consulta",
  "atendida",
  "pagada",
];

export function toMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function rangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
) {
  const endA = startA + Math.max(durationA, 1);
  const endB = startB + Math.max(durationB, 1);
  return startA < endB && startB < endA;
}

export function todayISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function productStatus(stock: number, minStock: number): Product["status"] {
  if (stock <= 0) return "sin_stock";
  if (stock <= Math.ceil(minStock * 0.5)) return "critico";
  if (stock <= minStock) return "bajo";
  return "normal";
}

export function vaccinationStatus(
  nextDue: string,
  today = todayISODate(),
  seriesStatus: Vaccination["seriesStatus"] = "activa",
): Vaccination["status"] {
  if (seriesStatus === "completada") return "completada";
  const due = new Date(`${nextDue}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencida";
  if (diff <= 7) return "proxima";
  return "vigente";
}

export function addDaysISO(dateISO: string, days: number) {
  const date = new Date(`${dateISO.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayISODate(date);
}

export function canMoveForward(from: AppointmentStatus, to: AppointmentStatus) {
  if (to === "cancelada" || to === "no_asistio") {
    return from === "programada" || from === "confirmada" || from === "llego";
  }
  const current = FORWARD_FLOW.indexOf(from);
  const next = FORWARD_FLOW.indexOf(to);
  return current !== -1 && next > current;
}

export function stepBack(status: AppointmentStatus): AppointmentStatus | undefined {
  const index = FORWARD_FLOW.indexOf(status);
  if (index <= 0) return undefined;
  return FORWARD_FLOW[index - 1];
}

export function correctionTarget(appointment: Appointment): AppointmentStatus | undefined {
  if (appointment.status === "pagada" || appointment.saleId) return undefined;
  if (appointment.status === "programada") return undefined;
  return appointment.statusBefore ?? stepBack(appointment.status);
}
