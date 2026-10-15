import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import type {
  CreateHospitalizationInput,
  Hospitalization,
  HospitalizationNote,
} from "@/types/hospitalization";

export const hospitalizationsService = {
  getHospitalizations(): Hospitalization[] {
    return readSnapshot().hospitalizations;
  },

  getActive(): Hospitalization[] {
    return this.getHospitalizations().filter((item) => item.status !== "alta");
  },

  getById(id: string): Hospitalization | undefined {
    return this.getHospitalizations().find((item) => item.id === id);
  },

  async create(data: CreateHospitalizationInput): Promise<Hospitalization> {
    return api<Hospitalization>("/hospitalizations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async addNote(
    id: string,
    note: Omit<HospitalizationNote, "id">,
  ): Promise<Hospitalization> {
    return api<Hospitalization>(`/hospitalizations/${id}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    });
  },

  async updateStatus(
    id: string,
    status: Hospitalization["status"],
  ): Promise<Hospitalization> {
    return api<Hospitalization>(`/hospitalizations/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
};
