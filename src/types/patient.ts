export type Species =
  | "perro"
  | "gato"
  | "ave"
  | "conejo"
  | "hamster"
  | "cobayo"
  | "tortuga"
  | "reptil"
  | "otro";

export type Sex = "macho" | "hembra";
export type PatientStatus = "activo" | "inactivo";
export type VitalStatus = "vivo" | "fallecido";
export type ReproductiveStatus = "entero" | "esterilizado" | "desconocido";
export type AllergyStatus = "confirmada" | "sospechada";
export type AllergySeverity = "leve" | "moderada" | "grave";
export type HandlingAlert = "miedo" | "agresividad" | "contacto" | "manipulacion";
export type InfoSource = "tutor" | "documento" | "evaluacion";

export type PatientAllergy = {
  id: string;
  substance: string;
  reaction: string;
  severity?: AllergySeverity | "";
  status: AllergyStatus;
};

export type AdverseReaction = {
  id: string;
  product: string;
  reaction: string;
  severity?: AllergySeverity | "";
};

export type ChronicCondition = {
  id: string;
  name: string;
  notes: string;
};

export type WeightEntry = {
  id: string;
  kg: number;
  measuredAt: string;
  recordedByName: string;
};

export type Patient = {
  id: string;
  code?: string;
  name: string;
  altName?: string;
  species: Species;
  breed: string;
  sex: Sex;
  coat?: string;
  birthDate: string;
  birthIsEstimated?: boolean;
  ageYears?: number | null;
  ageMonths?: number | null;
  weight: number;
  weights?: WeightEntry[];
  microchip: string | null;
  microchipImplantedOn?: string;
  microchipPlace?: string;
  reproductiveStatus?: ReproductiveStatus;
  sterilizedOn?: string;
  sterilizationProcedure?: string;
  allergies: string[];
  confirmedAllergies?: PatientAllergy[];
  adverseReactions?: AdverseReaction[];
  chronicConditions?: ChronicCondition[];
  handlingAlerts?: HandlingAlert[];
  safetyNotes?: string;
  infoSource?: InfoSource | "";
  clientId: string;
  status: PatientStatus;
  vitalStatus?: VitalStatus;
  deceasedOn?: string;
  lastVisit: string | null;
  photoUrl?: string;
  createdAt?: string;
  createdByName?: string;
  updatedAt?: string | null;
  updatedByName?: string;
};

export type CreatePatientInput = {
  name: string;
  altName?: string;
  species: Species;
  breed?: string;
  sex: Sex;
  coat?: string;
  birthDate?: string;
  birthIsEstimated?: boolean;
  ageYears?: number;
  ageMonths?: number;
  weight?: number;
  measuredAt?: string;
  confirmExtremeWeight?: boolean;
  microchip?: string | null;
  microchipImplantedOn?: string;
  microchipPlace?: string;
  reproductiveStatus?: ReproductiveStatus;
  sterilizedOn?: string;
  sterilizationProcedure?: string;
  allergies?: string[];
  confirmedAllergies?: Omit<PatientAllergy, "id">[];
  adverseReactions?: Omit<AdverseReaction, "id">[];
  chronicConditions?: Omit<ChronicCondition, "id">[];
  handlingAlerts?: HandlingAlert[];
  safetyNotes?: string;
  infoSource?: InfoSource | "";
  photoUrl?: string;
  clientId: string;
  status?: PatientStatus;
};
