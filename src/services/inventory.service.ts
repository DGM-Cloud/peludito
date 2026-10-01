import {
  inventoryBatches as seedBatches,
  inventoryMovements as seedMovements,
  products as seedProducts,
} from "@/data/mock/inventory";
import type {
  CreateProductInput,
  InventoryBatch,
  InventoryMovement,
  Product,
} from "@/types/product";
import { DEMO_TODAY } from "@/config/demo";

let productsStore: Product[] = [...seedProducts];
const batchesStore: InventoryBatch[] = [...seedBatches];
let movementsStore: InventoryMovement[] = [...seedMovements];

function resolveStatus(stock: number, minStock: number): Product["status"] {
  if (stock <= 0) return "sin_stock";
  if (stock <= Math.ceil(minStock * 0.5)) return "critico";
  if (stock <= minStock) return "bajo";
  return "normal";
}

export const inventoryService = {
  getProducts(): Product[] {
    return productsStore.map((p) => ({
      ...p,
      status: resolveStatus(p.stock, p.minStock),
    }));
  },

  getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  },

  getBatches(): InventoryBatch[] {
    return [...batchesStore];
  },

  getBatchesByProductId(productId: string): InventoryBatch[] {
    return batchesStore.filter((b) => b.productId === productId);
  },

  getExpiringBatches(withinDays = 30): InventoryBatch[] {
    const today = new Date(DEMO_TODAY);
    return batchesStore.filter((b) => {
      const exp = new Date(b.expiryDate);
      const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= withinDays;
    });
  },

  getLowStock(): Product[] {
    return this.getProducts().filter(
      (p) => p.status === "bajo" || p.status === "critico" || p.status === "sin_stock",
    );
  },

  getMovements(): InventoryMovement[] {
    return [...movementsStore];
  },

  createProduct(data: CreateProductInput): Product {
    const product: Product = {
      ...data,
      id: `prd-${Date.now()}`,
      status: resolveStatus(data.stock, data.minStock),
    };
    productsStore = [product, ...productsStore];
    return product;
  },

  updateProduct(id: string, data: Partial<Product>): Product | undefined {
    const index = productsStore.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const merged = { ...productsStore[index], ...data, id };
    merged.status = resolveStatus(merged.stock, merged.minStock);
    productsStore[index] = merged;
    return merged;
  },

  deductStock(
    productId: string,
    quantity: number,
    reason: string,
    saleId?: string,
  ): Product | undefined {
    const product = productsStore.find((p) => p.id === productId);
    if (!product) return undefined;
    const nextStock = Math.max(0, product.stock - quantity);
    movementsStore = [
      {
        id: `mov-${Date.now()}`,
        productId,
        type: "salida",
        quantity,
        reason,
        date: DEMO_TODAY,
        saleId,
      },
      ...movementsStore,
    ];
    return this.updateProduct(productId, { stock: nextStock });
  },
};
