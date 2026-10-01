import { medicalRecords as seedRecords } from "@/data/mock/medical-records";
import type {
  CreateMedicalRecordInput,
  MedicalRecord,
} from "@/types/medical-record";

let recordsStore: MedicalRecord[] = [...seedRecords];

export const medicalRecordsService = {
  getMedicalRecords(): MedicalRecord[] {
    return [...recordsStore].sort((a, b) => b.date.localeCompare(a.date));
  },

  getMedicalRecordById(id: string): MedicalRecord | undefined {
    return recordsStore.find((r) => r.id === id);
  },

  getRecordsByPatientId(patientId: string): MedicalRecord[] {
    return recordsStore
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  createMedicalRecord(data: CreateMedicalRecordInput): MedicalRecord {
    const record: MedicalRecord = {
      ...data,
      id: `mr-${Date.now()}`,
      status: data.status ?? "abierta",
    };
    recordsStore = [record, ...recordsStore];
    return record;
  },

  updateMedicalRecord(
    id: string,
    data: Partial<MedicalRecord>,
  ): MedicalRecord | undefined {
    const index = recordsStore.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    recordsStore[index] = { ...recordsStore[index], ...data, id };
    return recordsStore[index];
  },
};
