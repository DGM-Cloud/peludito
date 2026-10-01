"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { productCategories } from "@/data/constants/categories";
import type { CreateProductInput, ProductCategory } from "@/types/product";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput) => void;
};

export function ProductForm({ open, onClose, onSubmit }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    category: "medicamentos" as ProductCategory,
    stock: "",
    minStock: "",
    price: "",
    unit: "unidad",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSubmit({
      name: form.name,
      category: form.category,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      price: Number(form.price) || 0,
      unit: form.unit,
    });
    toast("✓ Producto creado correctamente");
    onClose();
    setForm({
      name: "",
      category: "medicamentos",
      stock: "",
      minStock: "",
      price: "",
      unit: "unidad",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo producto"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form">
            Guardar producto
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Producto"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <Select
          label="Categoría"
          options={productCategories.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value as ProductCategory })
          }
        />
        <Input
          label="Unidad"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <Input
          label="Stock"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <Input
          label="Stock mínimo"
          type="number"
          value={form.minStock}
          onChange={(e) => setForm({ ...form, minStock: e.target.value })}
        />
        <Input
          label="Precio (S/)"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
      </form>
    </Modal>
  );
}
