import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import { todayISODate } from "@/utils/formatDate";
import type { CreateProductInput, Product } from "@/types/product";

export const inventoryService = {
  getProducts(): Product[] {
    return readSnapshot().products;
  },

  getProductById(id: string): Product | undefined {
    return this.getProducts().find((product) => product.id === id);
  },

  getBatches() {
    return readSnapshot().batches;
  },

  getBatchesByProductId(productId: string) {
    return this.getBatches().filter((batch) => batch.productId === productId);
  },

  getExpiringBatches(withinDays = 30) {
    const today = new Date(`${todayISODate()}T12:00:00`);
    return this.getBatches().filter((batch) => {
      const diff =
        (new Date(`${batch.expiryDate}T12:00:00`).getTime() - today.getTime()) /
        86400000;
      return diff >= 0 && diff <= withinDays;
    });
  },

  getLowStock(): Product[] {
    return this.getProducts().filter((product) => product.status !== "normal");
  },

  getMovements() {
    return readSnapshot().movements;
  },

  async createProduct(data: CreateProductInput): Promise<Product> {
    return api<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return api<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
