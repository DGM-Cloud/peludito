export type Species = "perro" | "gato" | "ave" | "conejo";
export type Sex = "macho" | "hembra";
export type PatientStatus = "activo" | "inactivo";

export type Patient = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: string;
  weight: number;
  microchip: string | null;
  allergies: string[];
  clientId: string;
  status: PatientStatus;
  lastVisit: string | null;
  photoUrl?: string;
};

export type CreatePatientInput = Omit<Patient, "id" | "lastVisit" | "status"> & {
  status?: PatientStatus;
};
