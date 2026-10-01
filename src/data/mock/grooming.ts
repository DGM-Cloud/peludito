import type { GroomingAppointment } from "@/types/grooming";

export const groomingAppointments: GroomingAppointment[] = [
  {
    id: "grm-1",
    patientId: "pat-4",
    clientId: "cli-4",
    clinicId: "clinic-1",
    service: "grooming_completo",
    date: "2026-09-22",
    time: "10:00",
    professional: "Karla Ruiz",
    status: "programada",
    appointmentId: "apt-nala-groom",
  },
  {
    id: "grm-2",
    patientId: "pat-8",
    clientId: "cli-1",
    clinicId: "clinic-1",
    service: "bano",
    date: "2026-09-22",
    time: "15:00",
    professional: "Karla Ruiz",
    status: "programada",
  },
  {
    id: "grm-3",
    patientId: "pat-6",
    clientId: "cli-6",
    clinicId: "clinic-1",
    service: "corte_unas",
    date: "2026-09-21",
    time: "11:00",
    professional: "Diego Paredes",
    status: "entregada",
    saleId: "sale-bruno-unas",
  },
];
