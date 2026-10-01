export type MedicalRecordStatus = "abierta" | "cerrada" | "seguimiento";

export type MedicalRecord = {
  id: string;
  patientId: string;
  veterinarianId: string;
  date: string;
  reason: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  medications: string[];
  observations?: string;
  status: MedicalRecordStatus;
};

export type CreateMedicalRecordInput = Omit<MedicalRecord, "id" | "status"> & {
  status?: MedicalRecordStatus;
};
