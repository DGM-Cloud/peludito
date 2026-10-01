import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PosView } from "@/components/pos/PosView";
import { Suspense } from "react";

export const metadata = { title: "Caja" };

export default function PosPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Caja"
        description="Cobra servicios y productos. Actualiza inventario al confirmar."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando caja…</p>}>
        <PosView />
      </Suspense>
    </PageContainer>
  );
}
