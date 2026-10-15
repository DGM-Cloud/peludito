import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import type { CreateGroomingInput, GroomingAppointment } from "@/types/grooming";

export const groomingService = {
  getAll(): GroomingAppointment[] {
    return [...readSnapshot().grooming].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
  },

  getByDate(date: string): GroomingAppointment[] {
    return this.getAll().filter((item) => item.date === date);
  },

  async create(data: CreateGroomingInput): Promise<GroomingAppointment> {
    return api<GroomingAppointment>("/grooming", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateStatus(
    id: string,
    status: GroomingAppointment["status"],
  ): Promise<GroomingAppointment> {
    return api<GroomingAppointment>(`/grooming/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
};
