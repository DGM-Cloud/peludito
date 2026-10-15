import { api } from "@/lib/api";
import { readSnapshot, rememberMedicalRecord } from "@/lib/clinic-cache";
import type { CreateMedicalRecordInput, MedicalRecord } from "@/types/medical-record";

export const medicalRecordsService = {
  getMedicalRecords(): MedicalRecord[] {
    return [...readSnapshot().medicalRecords].sort((a, b) => b.date.localeCompare(a.date));
  },

  getMedicalRecordById(id: string): MedicalRecord | undefined {
    return this.getMedicalRecords().find((record) => record.id === id);
  },

  getRecordsByPatientId(patientId: string): MedicalRecord[] {
    return this.getMedicalRecords().filter((record) => record.patientId === patientId);
  },

  async createMedicalRecord(data: CreateMedicalRecordInput): Promise<MedicalRecord> {
    const created = await api<MedicalRecord>("/medical-records", {
      method: "POST",
      body: JSON.stringify(data),
    });
    rememberMedicalRecord(created);
    return created;
  },

  async updateMedicalRecord(id: string, data: Partial<MedicalRecord>): Promise<MedicalRecord> {
    const updated = await api<MedicalRecord>(`/medical-records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    rememberMedicalRecord(updated);
    return updated;
  },
};
