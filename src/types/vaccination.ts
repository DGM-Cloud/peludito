export type VaccinationStatus = "vigente" | "proxima" | "vencida" | "completada";

export type Vaccination = {
  id: string;
  patientId: string;
  name: string;
  laboratory: string;
  lot: string;
  dateApplied: string;
  nextDue: string;
  veterinarianId: string;
  status: VaccinationStatus;
  notes?: string;
};

export type CreateVaccinationInput = Omit<Vaccination, "id" | "status"> & {
  status?: VaccinationStatus;
};
