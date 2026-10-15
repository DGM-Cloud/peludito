export type AppointmentStatus =
  | "programada"
  | "confirmada"
  | "llego"
  | "en_consulta"
  | "atendida"
  | "pagada"
  | "cancelada"
  | "no_asistio";

export type AppointmentServiceType =
  | "consulta"
  | "control"
  | "vacunacion"
  | "cirugia"
  | "grooming"
  | "emergencia"
  | "desparasitacion";

export type AppointmentChannel = "presencial" | "telefono" | "whatsapp";

export type ClientReply = "confirmada" | "no_puede";

export type Appointment = {
  id: string;
  patientId: string;
  clientId: string;
  veterinarianId: string;
  clinicId: string;
  date: string;
  time: string;
  reason: string;
  serviceType: AppointmentServiceType;
  durationMinutes?: number;
  estimatedPrice?: number;
  channel?: AppointmentChannel;
  remindClient?: boolean;
  publicToken?: string;
  clientReply?: ClientReply;
  notes?: string;
  status: AppointmentStatus;
  /** Estado inmediatamente anterior. Solo sirve para corregir un error. */
  statusBefore?: AppointmentStatus;
  medicalRecordId?: string;
  saleId?: string;
};

export type CreateAppointmentInput = Omit<
  Appointment,
  "id" | "status" | "medicalRecordId" | "saleId" | "publicToken" | "clientReply"
> & {
  status?: AppointmentStatus;
};
