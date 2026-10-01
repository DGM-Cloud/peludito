export type HospitalizationStatus =
  | "estable"
  | "observacion"
  | "critico"
  | "alta_pendiente"
  | "alta";

export type HospitalizationNote = {
  id: string;
  date: string;
  time: string;
  note: string;
  veterinarianId: string;
};

export type Hospitalization = {
  id: string;
  patientId: string;
  clinicId: string;
  cage: string;
  reason: string;
  veterinarianId: string;
  admissionDate: string;
  status: HospitalizationStatus;
  treatment: string;
  observations?: string;
  notes: HospitalizationNote[];
  dischargeDate?: string;
};

export type CreateHospitalizationInput = Omit<
  Hospitalization,
  "id" | "notes" | "dischargeDate"
> & {
  notes?: HospitalizationNote[];
};
