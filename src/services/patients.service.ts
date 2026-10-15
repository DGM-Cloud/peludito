import { api } from "@/lib/api";
import { readSnapshot, rememberPatient } from "@/lib/clinic-cache";
import type { CreatePatientInput, Patient } from "@/types/patient";

export const patientsService = {
  getPatients(): Patient[] {
    return readSnapshot().patients;
  },

  getPatientById(id: string): Patient | undefined {
    return this.getPatients().find((patient) => patient.id === id);
  },

  getPatientsByClientId(clientId: string): Patient[] {
    return this.getPatients().filter((patient) => patient.clientId === clientId);
  },

  search(query: string): Patient[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.getPatients().filter(
      (patient) =>
        patient.name.toLowerCase().includes(q) ||
        patient.breed.toLowerCase().includes(q),
    );
  },

  async findPossibleDuplicates(input: {
    microchip?: string;
    name?: string;
    species?: string;
    clientId?: string;
  }): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (input.microchip) params.set("microchip", input.microchip);
    if (input.name) params.set("name", input.name);
    if (input.species) params.set("species", input.species);
    if (input.clientId) params.set("clientId", input.clientId);
    if ([...params.keys()].length === 0) return [];
    return api<Patient[]>(`/patients/duplicates?${params.toString()}`);
  },

  async createPatient(data: CreatePatientInput): Promise<Patient> {
    const created = await api<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    });
    rememberPatient(created);
    return created;
  },

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const updated = await api<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    rememberPatient(updated);
    return updated;
  },
};
