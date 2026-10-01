import { groomingAppointments as seed } from "@/data/mock/grooming";
import type { CreateGroomingInput, GroomingAppointment } from "@/types/grooming";

let store: GroomingAppointment[] = [...seed];

export const groomingService = {
  getAll(): GroomingAppointment[] {
    return [...store].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
  },

  getByDate(date: string): GroomingAppointment[] {
    return this.getAll().filter((g) => g.date === date);
  },

  create(data: CreateGroomingInput): GroomingAppointment {
    const item: GroomingAppointment = {
      ...data,
      id: `grm-${Date.now()}`,
      status: data.status ?? "programada",
    };
    store = [item, ...store];
    return item;
  },

  updateStatus(
    id: string,
    status: GroomingAppointment["status"],
  ): GroomingAppointment | undefined {
    const i = store.findIndex((g) => g.id === id);
    if (i === -1) return undefined;
    store[i] = { ...store[i], status };
    return store[i];
  },
};
