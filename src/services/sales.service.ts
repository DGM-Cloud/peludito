import { sales as seedSales } from "@/data/mock/sales";
import { inventoryService } from "@/services/inventory.service";
import type { CreateSaleInput, PaymentMethod, Sale } from "@/types/sale";

let store: Sale[] = [...seedSales];
let voucherSeq = 1247;

export const salesService = {
  getSales(): Sale[] {
    return [...store].sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
    );
  },

  getSaleById(id: string): Sale | undefined {
    return store.find((s) => s.id === id);
  },

  getSalesByDate(date: string): Sale[] {
    return this.getSales().filter((s) => s.date === date);
  },

  getSalesByClientId(clientId: string): Sale[] {
    return this.getSales().filter((s) => s.clientId === clientId);
  },

  getCashSummary(date: string) {
    const daySales = this.getSalesByDate(date);
    const byMethod = (method: PaymentMethod) =>
      daySales
        .filter((s) => s.paymentMethod === method)
        .reduce((acc, s) => acc + s.total, 0);

    return {
      efectivo: byMethod("efectivo"),
      yape: byMethod("yape"),
      plin: byMethod("plin"),
      tarjeta: byMethod("tarjeta"),
      total: daySales.reduce((acc, s) => acc + s.total, 0),
      count: daySales.length,
    };
  },

  createSale(data: CreateSaleInput): Sale {
    const voucherNumber =
      data.voucherType === "boleta"
        ? `B001-${String(voucherSeq++).padStart(8, "0")}`
        : data.voucherType === "factura"
          ? `F001-${String(voucherSeq++).padStart(8, "0")}`
          : undefined;

    const sale: Sale = {
      ...data,
      id: `sale-${Date.now()}`,
      voucherNumber,
    };

    for (const item of sale.items) {
      if (item.type === "producto") {
        inventoryService.deductStock(
          item.referenceId,
          item.quantity,
          `Venta ${sale.id}`,
          sale.id,
        );
      }
    }

    store = [sale, ...store];
    return sale;
  },
};
