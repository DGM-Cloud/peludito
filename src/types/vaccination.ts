import type { Species } from "@/types/patient";

export type VaccinationStatus = "vigente" | "proxima" | "vencida" | "completada";

export type VaccinationRoute =
  | "subcutanea"
  | "intramuscular"
  | "oral"
  | "nasal"
  | "otra";

export type VaccinationSeriesStatus = "activa" | "completada";

export type VaccineCatalogItem = {
  id: string;
  name: string;
  species: Species[];
  defaultIntervalDays: number;
  laboratoryHint: string;
  active: boolean;
};

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
  catalogId?: string | null;
  lotExpiry?: string | null;
  route: VaccinationRoute;
  site?: string | null;
  doseMl?: number | null;
  seriesStatus: VaccinationSeriesStatus;
  medicalRecordId?: string | null;
};

export type CreateVaccinationInput = {
  patientId: string;
  name: string;
  laboratory: string;
  lot: string;
  dateApplied: string;
  nextDue: string;
  veterinarianId: string;
  notes?: string;
  catalogId?: string | null;
  lotExpiry?: string | null;
  route?: VaccinationRoute;
  site?: string | null;
  doseMl?: number | null;
  seriesStatus?: VaccinationSeriesStatus;
  medicalRecordId?: string | null;
  /** Si true (default) y no hay medicalRecordId, crea una HC breve. */
  registerInHistory?: boolean;
};

export type UpdateVaccinationInput = Partial<
  Omit<Vaccination, "id" | "status" | "patientId">
> & {
  patientId?: string;
};
