import type { ActivityItem } from "@/types/dashboard";

export const recentActivity: ActivityItem[] = [
  {
    id: "act-1",
    message: "Max llegó a recepción para vacunación.",
    timestamp: "2026-09-22T09:02:00",
    type: "appointment",
  },
  {
    id: "act-2",
    message: "Bruno pasó a consulta con Dra. Andrea.",
    timestamp: "2026-09-22T09:05:00",
    type: "consultation",
  },
  {
    id: "act-3",
    message: "Simba atendido — dermatitis. Pendiente de cobro.",
    timestamp: "2026-09-22T08:20:00",
    type: "consultation",
  },
  {
    id: "act-4",
    message: "Se actualizó evolución de Luna en hospitalización.",
    timestamp: "2026-09-22T08:00:00",
    type: "consultation",
  },
  {
    id: "act-5",
    message: "Venta registrada: Alimento premium (Yape).",
    timestamp: "2026-09-22T08:10:00",
    type: "sale",
  },
];
