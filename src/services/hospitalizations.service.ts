import { hospitalizations as seed } from "@/data/mock/hospitalizations";
import type {
  CreateHospitalizationInput,
  Hospitalization,
  HospitalizationNote,
} from "@/types/hospitalization";

let store: Hospitalization[] = [...seed];

export const hospitalizationsService = {
  getHospitalizations(): Hospitalization[] {
    return [...store];
  },

  getActive(): Hospitalization[] {
    return store.filter((h) => h.status !== "alta");
  },

  getById(id: string): Hospitalization | undefined {
    return store.find((h) => h.id === id);
  },

  create(data: CreateHospitalizationInput): Hospitalization {
    const item: Hospitalization = {
      ...data,
      id: `hosp-${Date.now()}`,
      notes: data.notes ?? [],
    };
    store = [item, ...store];
    return item;
  },

  addNote(id: string, note: Omit<HospitalizationNote, "id">): Hospitalization | undefined {
    const i = store.findIndex((h) => h.id === id);
    if (i === -1) return undefined;
    const full: HospitalizationNote = { ...note, id: `hn-${Date.now()}` };
    store[i] = { ...store[i], notes: [...store[i].notes, full] };
    return store[i];
  },

  updateStatus(
    id: string,
    status: Hospitalization["status"],
  ): Hospitalization | undefined {
    const i = store.findIndex((h) => h.id === id);
    if (i === -1) return undefined;
    store[i] = {
      ...store[i],
      status,
      dischargeDate: status === "alta" ? new Date().toISOString().slice(0, 10) : store[i].dischargeDate,
    };
    return store[i];
  },
};
