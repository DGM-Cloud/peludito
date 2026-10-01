import { followUps as seed } from "@/data/mock/follow-ups";
import type { CreateFollowUpInput, FollowUp } from "@/types/follow-up";

let store: FollowUp[] = [...seed];

export const followUpsService = {
  getFollowUps(): FollowUp[] {
    return [...store].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  getPending(): FollowUp[] {
    return this.getFollowUps().filter((f) => f.status === "pendiente");
  },

  createFollowUp(data: CreateFollowUpInput): FollowUp {
    const item: FollowUp = {
      ...data,
      id: `fu-${Date.now()}`,
      status: data.status ?? "pendiente",
    };
    store = [item, ...store];
    return item;
  },

  updateFollowUp(id: string, data: Partial<FollowUp>): FollowUp | undefined {
    const i = store.findIndex((f) => f.id === id);
    if (i === -1) return undefined;
    store[i] = { ...store[i], ...data, id };
    return store[i];
  },
};
