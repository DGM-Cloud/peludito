import type {
  DailyConsultations,
  MonthlySales,
  ServiceUsage,
  TopProduct,
} from "@/types/dashboard";

/** Legacy chart seed data — operational KPIs now come from live services. */
export const consultationsLast7Days: DailyConsultations[] = [
  { date: "2026-09-16", label: "Mar", count: 6 },
  { date: "2026-09-17", label: "Mié", count: 9 },
  { date: "2026-09-18", label: "Jue", count: 11 },
  { date: "2026-09-19", label: "Vie", count: 8 },
  { date: "2026-09-20", label: "Sáb", count: 5 },
  { date: "2026-09-21", label: "Dom", count: 3 },
  { date: "2026-09-22", label: "Lun", count: 8 },
];

export const monthlySales: MonthlySales[] = [
  { month: "Abr", total: 12400 },
  { month: "May", total: 13850 },
  { month: "Jun", total: 15200 },
  { month: "Jul", total: 14100 },
  { month: "Ago", total: 16800 },
  { month: "Sep", total: 15420 },
];

export const topServices: ServiceUsage[] = [
  { name: "Consulta general", count: 48 },
  { name: "Vacunación", count: 36 },
  { name: "Control", count: 29 },
  { name: "Grooming", count: 22 },
  { name: "Dermatología", count: 18 },
];

export const topProducts: TopProduct[] = [
  { name: "Alimento premium adulto", quantity: 42 },
  { name: "Antiparasitario interno", quantity: 38 },
  { name: "Champú hipoalergénico", quantity: 31 },
  { name: "Collar antipulgas", quantity: 27 },
  { name: "Amoxicilina 500mg", quantity: 24 },
];
