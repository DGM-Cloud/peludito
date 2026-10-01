export type GroomingService =
  | "bano"
  | "corte"
  | "bano_medicado"
  | "corte_unas"
  | "grooming_completo";

export type GroomingStatus =
  | "programada"
  | "en_proceso"
  | "lista"
  | "entregada"
  | "cancelada";

export type GroomingAppointment = {
  id: string;
  patientId: string;
  clientId: string;
  clinicId: string;
  service: GroomingService;
  date: string;
  time: string;
  professional: string;
  status: GroomingStatus;
  appointmentId?: string;
  saleId?: string;
  notes?: string;
};

export type CreateGroomingInput = Omit<
  GroomingAppointment,
  "id" | "status" | "appointmentId" | "saleId"
> & {
  status?: GroomingStatus;
};
