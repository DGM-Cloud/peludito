export const appointmentStatuses = [
  { value: "programada", label: "Programada", color: "muted" },
  { value: "confirmada", label: "Confirmada", color: "success" },
  { value: "llego", label: "Llegó", color: "primary" },
  { value: "en_consulta", label: "En consulta", color: "warning" },
  { value: "atendida", label: "Atendida", color: "primary" },
  { value: "pagada", label: "Pagada", color: "success" },
  { value: "cancelada", label: "Cancelada", color: "danger" },
  { value: "no_asistio", label: "No asistió", color: "danger" },
] as const;

export const patientStatuses = [
  { value: "activo", label: "Activo", color: "success" },
  { value: "inactivo", label: "Inactivo", color: "muted" },
] as const;

export const productStatuses = [
  { value: "normal", label: "Normal", color: "success" },
  { value: "bajo", label: "Bajo", color: "warning" },
  { value: "critico", label: "Crítico", color: "danger" },
  { value: "sin_stock", label: "Sin stock", color: "danger" },
] as const;

export const medicalRecordStatuses = [
  { value: "abierta", label: "Abierta", color: "warning" },
  { value: "cerrada", label: "Cerrada", color: "success" },
  { value: "seguimiento", label: "Seguimiento", color: "primary" },
] as const;

export const paymentMethods = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "tarjeta", label: "Tarjeta" },
] as const;

export const hospitalizationStatuses = [
  { value: "estable", label: "Estable", color: "success" },
  { value: "observacion", label: "Observación", color: "warning" },
  { value: "critico", label: "Crítico", color: "danger" },
  { value: "alta_pendiente", label: "Alta pendiente", color: "primary" },
  { value: "alta", label: "Alta", color: "muted" },
] as const;

export const groomingServices = [
  { value: "bano", label: "Baño", price: 50 },
  { value: "corte", label: "Corte", price: 70 },
  { value: "bano_medicado", label: "Baño medicado", price: 65 },
  { value: "corte_unas", label: "Corte de uñas", price: 25 },
  { value: "grooming_completo", label: "Grooming completo", price: 90 },
] as const;

export const vaccinationStatuses = [
  { value: "vigente", label: "Vigente", color: "success" },
  { value: "proxima", label: "Próxima", color: "warning" },
  { value: "vencida", label: "Vencida", color: "danger" },
  { value: "completada", label: "Completada", color: "muted" },
] as const;

export const groomingStatuses = [
  { value: "programada", label: "Programada", color: "muted" },
  { value: "en_proceso", label: "En proceso", color: "warning" },
  { value: "lista", label: "Lista", color: "primary" },
  { value: "entregada", label: "Entregada", color: "success" },
  { value: "cancelada", label: "Cancelada", color: "danger" },
] as const;

export const followUpTypes = [
  { value: "vacuna", label: "Vacuna" },
  { value: "control", label: "Control" },
  { value: "desparasitacion", label: "Desparasitación" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "grooming", label: "Grooming" },
  { value: "revision", label: "Revisión" },
  { value: "no_show", label: "No asistió" },
] as const;

export const followUpStatuses = [
  { value: "pendiente", label: "Pendiente", color: "warning" },
  { value: "contactado", label: "Contactado", color: "primary" },
  { value: "completado", label: "Completado", color: "success" },
  { value: "cancelado", label: "Cancelado", color: "muted" },
] as const;
