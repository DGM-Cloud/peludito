import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { VaccinesView } from "@/components/vaccines/VaccinesView";
import { Suspense } from "react";

export const metadata = { title: "Vacunas" };

export default function VaccinesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Vacunas"
        description="Carné clínico: próximas, vencidas, refuerzos y vínculo con el historial del paciente."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <VaccinesView />
      </Suspense>
    </PageContainer>
  );
}
