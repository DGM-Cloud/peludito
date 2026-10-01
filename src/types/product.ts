export type ProductCategory =
  | "medicamentos"
  | "alimentos"
  | "accesorios"
  | "higiene"
  | "vacunas";

export type ProductStatus = "normal" | "bajo" | "critico" | "sin_stock";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  minStock: number;
  price: number;
  unit: string;
  status: ProductStatus;
  presentation?: string;
  provider?: string;
};

export type InventoryBatch = {
  id: string;
  productId: string;
  lot: string;
  expiryDate: string;
  quantity: number;
  provider: string;
  receivedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: "entrada" | "salida" | "ajuste";
  quantity: number;
  reason: string;
  date: string;
  saleId?: string;
};

export type CreateProductInput = Omit<Product, "id" | "status">;
