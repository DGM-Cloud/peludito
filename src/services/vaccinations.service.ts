import { api } from "@/lib/api";
import { readSnapshot, rememberVaccination } from "@/lib/clinic-cache";
import type {
  CreateVaccinationInput,
  UpdateVaccinationInput,
  Vaccination,
  VaccineCatalogItem,
} from "@/types/vaccination";

export const vaccinationsService = {
  getVaccinations(): Vaccination[] {
    return [...readSnapshot().vaccinations].sort((a, b) =>
      b.dateApplied.localeCompare(a.dateApplied),
    );
  },

  getById(id: string): Vaccination | undefined {
    return this.getVaccinations().find((item) => item.id === id);
  },

  getByPatientId(patientId: string): Vaccination[] {
    return this.getVaccinations().filter((item) => item.patientId === patientId);
  },

  getByMedicalRecordId(medicalRecordId: string): Vaccination[] {
    return this.getVaccinations().filter(
      (item) => item.medicalRecordId === medicalRecordId,
    );
  },

  getPending(): Vaccination[] {
    return this.getVaccinations().filter(
      (item) => item.status === "proxima" || item.status === "vencida",
    );
  },

  getCatalog(): VaccineCatalogItem[] {
    return readSnapshot().vaccineCatalog.filter((item) => item.active);
  },

  /** Última dosis por nombre de vacuna (carné). */
  getCarnetByPatientId(patientId: string) {
    const byName = new Map<string, Vaccination>();
    for (const item of this.getByPatientId(patientId)) {
      const prev = byName.get(item.name);
      if (!prev || item.dateApplied > prev.dateApplied) {
        byName.set(item.name, item);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createVaccination(data: CreateVaccinationInput): Promise<Vaccination> {
    const created = await api<Vaccination>("/vaccinations", {
      method: "POST",
      body: JSON.stringify(data),
    });
    rememberVaccination(created);
    return created;
  },

  async updateVaccination(
    id: string,
    data: UpdateVaccinationInput,
  ): Promise<Vaccination> {
    const updated = await api<Vaccination>(`/vaccinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    rememberVaccination(updated);
    return updated;
  },

  async completeSeries(id: string): Promise<Vaccination> {
    return this.updateVaccination(id, { seriesStatus: "completada" });
  },

  async applyBooster(
    id: string,
    data: Partial<CreateVaccinationInput>,
  ): Promise<Vaccination> {
    const created = await api<Vaccination>(`/vaccinations/${id}/booster`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    rememberVaccination(created);
    return created;
  },

  getMedicationsByPatientId(patientId: string) {
    return readSnapshot().medications.filter((item) => item.patientId === patientId);
  },
};
