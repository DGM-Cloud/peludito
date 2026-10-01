"use client";

import { ProductForm } from "@/components/inventory/ProductForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { productCategories } from "@/data/constants/categories";
import { productStatuses } from "@/data/constants/statuses";
import { DEMO_TODAY } from "@/config/demo";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { inventoryService } from "@/services/inventory.service";
import type { ProductCategory } from "@/types/product";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function InventoryView() {
  const { version, refresh } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useModal();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [showLowManual, setShowLowManual] = useState(false);

  const urlLow = searchParams.get("filter") === "bajo";
  const showLow = urlLow || showLowManual;
  const effectiveCategory = urlLow ? "all" : category;

  const products = useMemo(
    () => inventoryService.getProducts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const batches = useMemo(
    () => inventoryService.getExpiringBatches(30),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const movements = useMemo(
    () => inventoryService.getMovements().slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query || p.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      effectiveCategory === "all" || p.category === effectiveCategory;
    const matchesLow =
      !showLow ||
      p.status === "bajo" ||
      p.status === "critico" ||
      p.status === "sin_stock";
    return matchesQuery && matchesCategory && matchesLow;
  });

  const clearLowFilter = () => {
    setShowLowManual(false);
    if (urlLow) router.replace("/inventory");
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar producto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar productos"
        />
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={modal.openModal}
        >
          Nuevo producto
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          label="Todos"
          active={effectiveCategory === "all" && !showLow}
          onClick={() => {
            setCategory("all");
            clearLowFilter();
          }}
        />
        <FilterChip
          label="Stock bajo / crítico"
          active={showLow}
          onClick={() => setShowLowManual(true)}
        />
        {productCategories.map((c) => (
          <FilterChip
            key={c.value}
            label={c.label}
            active={effectiveCategory === c.value && !showLow}
            onClick={() => {
              setCategory(c.value);
              clearLowFilter();
            }}
          />
        ))}
      </div>

      {batches.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Lotes próximos a vencer"
            description="Medicamentos y vacunas (30 días)"
          />
          <ul className="space-y-2">
            {batches.map((b) => {
              const product = inventoryService.getProductById(b.productId);
              const days = Math.ceil(
                (new Date(b.expiryDate).getTime() -
                  new Date(DEMO_TODAY).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-light/50 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{product?.name}</strong> · Lote {b.lot} ·{" "}
                    {b.quantity} uds · Prov. {b.provider}
                  </span>
                  <span className="text-warning">
                    ⚠ Vence en {days} días ({formatDate(b.expiryDate)})
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card padding={false}>
        <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH>Categoría</TH>
                <TH>Stock</TH>
                <TH>Mínimo</TH>
                <TH>Precio</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => {
                const cat = productCategories.find((c) => c.value === p.category);
                const status = productStatuses.find((s) => s.value === p.status);
                return (
                  <TR key={p.id}>
                    <TD>
                      <p className="font-medium">{p.name}</p>
                      {p.presentation ? (
                        <p className="text-xs text-muted">{p.presentation}</p>
                      ) : null}
                    </TD>
                    <TD>{cat?.label}</TD>
                    <TD>
                      {p.stock} {p.unit}
                    </TD>
                    <TD>{p.minStock}</TD>
                    <TD>{formatCurrency(p.price)}</TD>
                    <TD>
                      <StatusBadge
                        label={status?.label ?? p.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "danger") ?? "default"
                        }
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {filtered.map((p) => {
            const status = productStatuses.find((s) => s.value === p.status);
            return (
              <div key={p.id} className="px-4 py-4">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      Stock {p.stock} · {formatCurrency(p.price)}
                    </p>
                  </div>
                  <StatusBadge
                    label={status?.label ?? p.status}
                    tone={
                      (status?.color as "success" | "warning" | "danger") ??
                      "default"
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Movimientos recientes"
          description="Entradas y salidas de stock"
        />
        <ul className="divide-y divide-border text-sm">
          {movements.map((m) => {
            const product = inventoryService.getProductById(m.productId);
            return (
              <li
                key={m.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="font-medium">{product?.name}</p>
                  <p className="text-xs text-muted">
                    {m.reason} · {formatDate(m.date)}
                  </p>
                </div>
                <span
                  className={
                    m.type === "salida" ? "text-danger" : "text-success"
                  }
                >
                  {m.type === "salida" ? "−" : "+"}
                  {m.quantity}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <ProductForm
        open={modal.open}
        onClose={modal.closeModal}
        onSubmit={(data) => {
          inventoryService.createProduct(data);
          refresh();
        }}
      />
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-surface text-muted ring-1 ring-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
