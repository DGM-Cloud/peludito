import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryView } from "@/components/inventory/InventoryView";
import { Suspense } from "react";

export const metadata = { title: "Inventario" };

export default function InventoryPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Inventario"
        description="Medicamentos, alimentos, lotes y movimientos."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <InventoryView />
      </Suspense>
    </PageContainer>
  );
}
