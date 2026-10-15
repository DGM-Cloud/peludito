import { api } from "@/lib/api";
import { readSnapshot, rememberCatalog } from "@/lib/clinic-cache";
import type { CatalogService } from "@/types/clinic";

export const catalogService = {
  getServices() {
    return readSnapshot().catalog;
  },

  async updateService(id: string, data: { price: number; durationMinutes: number }) {
    const updated = await api<CatalogService>(`/catalog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    rememberCatalog(updated);
    return updated;
  },
};
