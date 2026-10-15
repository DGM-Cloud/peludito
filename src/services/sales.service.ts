import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import type { CreateSaleInput, PaymentMethod, Sale } from "@/types/sale";

export const salesService = {
  getSales(): Sale[] {
    return [...readSnapshot().sales].sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
    );
  },

  getSaleById(id: string): Sale | undefined {
    return this.getSales().find((sale) => sale.id === id);
  },

  getSalesByDate(date: string): Sale[] {
    return this.getSales().filter((sale) => sale.date === date);
  },

  getSalesByClientId(clientId: string): Sale[] {
    return this.getSales().filter((sale) => sale.clientId === clientId);
  },

  getCashSummary(date: string) {
    const daySales = this.getSalesByDate(date);
    const byMethod = (method: PaymentMethod) =>
      daySales
        .filter((sale) => sale.paymentMethod === method)
        .reduce((total, sale) => total + sale.total, 0);
    return {
      efectivo: byMethod("efectivo"),
      yape: byMethod("yape"),
      plin: byMethod("plin"),
      tarjeta: byMethod("tarjeta"),
      total: daySales.reduce((total, sale) => total + sale.total, 0),
      count: daySales.length,
    };
  },

  async createSale(data: CreateSaleInput): Promise<Sale> {
    return api<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
