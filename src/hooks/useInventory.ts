"use client";

import { useCallback, useState } from "react";
import { inventoryService } from "@/services/inventory.service";
import type { CreateProductInput, Product } from "@/types/product";

export function useInventory(initial?: Product[]) {
  const [products, setProducts] = useState<Product[]>(
    initial ?? inventoryService.getProducts(),
  );

  const create = useCallback((data: CreateProductInput) => {
    const created = inventoryService.createProduct(data);
    setProducts(inventoryService.getProducts());
    return created;
  }, []);

  return { products, create, setProducts };
}
