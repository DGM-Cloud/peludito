import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import type { CreateFollowUpInput, FollowUp } from "@/types/follow-up";

export const followUpsService = {
  getFollowUps(): FollowUp[] {
    return [...readSnapshot().followUps].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  getPending(): FollowUp[] {
    return this.getFollowUps().filter((item) => item.status === "pendiente");
  },

  async createFollowUp(data: CreateFollowUpInput): Promise<FollowUp> {
    return api<FollowUp>("/follow-ups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    return api<FollowUp>(`/follow-ups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
