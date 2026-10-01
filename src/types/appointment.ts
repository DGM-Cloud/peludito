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
  notes?: string;
  status: AppointmentStatus;
  /** Estado inmediatamente anterior. Solo sirve para corregir un error. */
  statusBefore?: AppointmentStatus;
  medicalRecordId?: string;
  saleId?: string;
};

export type CreateAppointmentInput = Omit<
  Appointment,
  "id" | "status" | "medicalRecordId" | "saleId"
> & {
  status?: AppointmentStatus;
};
