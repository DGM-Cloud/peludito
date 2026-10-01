export const DEMO_TODAY = "2026-09-22";
export const DEMO_NOW = "2026-09-22T09:15:00";

export const clinics = [
  {
    id: "clinic-1",
    name: "Clínica San Miguel",
    address: "Av. La Marina 1250, San Miguel",
    phone: "014561234",
  },
  {
    id: "clinic-2",
    name: "Clínica Miraflores",
    address: "Av. Benavides 480, Miraflores",
    phone: "014567890",
  },
] as const;

export const catalogServices = [
  { id: "svc-1", name: "Consulta general", category: "consulta", price: 80, durationMinutes: 30 },
  { id: "svc-2", name: "Control", category: "control", price: 60, durationMinutes: 20 },
  { id: "svc-3", name: "Vacunación", category: "vacunacion", price: 55, durationMinutes: 15 },
  { id: "svc-4", name: "Desparasitación", category: "desparasitacion", price: 45, durationMinutes: 15 },
  { id: "svc-5", name: "Grooming completo", category: "grooming", price: 90, durationMinutes: 60 },
  { id: "svc-6", name: "Baño", category: "grooming", price: 50, durationMinutes: 40 },
  { id: "svc-cut", name: "Corte de uñas", category: "grooming", price: 25, durationMinutes: 15 },
  { id: "svc-7", name: "Emergencia", category: "emergencia", price: 150, durationMinutes: 45 },
] as const;

export const demoRoles = [
  { id: "recepcion", label: "Recepción" },
  { id: "veterinario", label: "Veterinario" },
  { id: "caja", label: "Caja" },
  { id: "administrador", label: "Administrador" },
] as const;
