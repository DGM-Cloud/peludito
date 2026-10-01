import { patients as seedPatients } from "@/data/mock/patients";
import { clientsService } from "@/services/clients.service";
import type { CreatePatientInput, Patient } from "@/types/patient";

let patientsStore: Patient[] = [...seedPatients];

export const patientsService = {
  getPatients(): Patient[] {
    return [...patientsStore];
  },

  getPatientById(id: string): Patient | undefined {
    return patientsStore.find((p) => p.id === id);
  },

  getPatientsByClientId(clientId: string): Patient[] {
    return patientsStore.filter((p) => p.clientId === clientId);
  },

  search(query: string): Patient[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return patientsStore.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q),
    );
  },

  createPatient(data: CreatePatientInput): Patient {
    const patient: Patient = {
      ...data,
      id: `pat-${Date.now()}`,
      status: data.status ?? "activo",
      lastVisit: null,
    };
    patientsStore = [patient, ...patientsStore];

    const client = clientsService.getClientById(patient.clientId);
    if (client && !client.patientIds.includes(patient.id)) {
      clientsService.updateClient(client.id, {
        patientIds: [...client.patientIds, patient.id],
      });
    }

    return patient;
  },

  updatePatient(id: string, data: Partial<Patient>): Patient | undefined {
    const index = patientsStore.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    patientsStore[index] = { ...patientsStore[index], ...data, id };
    return patientsStore[index];
  },
};
