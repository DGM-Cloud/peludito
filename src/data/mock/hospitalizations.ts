import type { Hospitalization } from "@/types/hospitalization";

/** Solo Luna hospitalizada hoy. Max ya no está internado. */
export const hospitalizations: Hospitalization[] = [
  {
    id: "hosp-1",
    patientId: "pat-1",
    clinicId: "clinic-1",
    cage: "Jaula 04",
    reason: "Gastroenteritis — fluidoterapia y observación",
    veterinarianId: "vet-1",
    admissionDate: "2026-09-20",
    status: "estable",
    treatment: "Fluidoterapia + dieta blanda + amoxicilina",
    observations: "Come bien, hidratación normal. Alta posible mañana.",
    notes: [
      {
        id: "hn-1",
        date: "2026-09-20",
        time: "18:00",
        note: "Ingreso por gastroenteritis. Deshidratación leve. Se inicia fluidos.",
        veterinarianId: "vet-1",
      },
      {
        id: "hn-2",
        date: "2026-09-21",
        time: "09:30",
        note: "Mejoría clínica. Continúa fluidos y dieta blanda.",
        veterinarianId: "vet-1",
      },
      {
        id: "hn-3",
        date: "2026-09-22",
        time: "08:00",
        note: "Estable. Sin vómitos. Evaluar alta para mañana.",
        veterinarianId: "vet-2",
      },
    ],
  },
];
