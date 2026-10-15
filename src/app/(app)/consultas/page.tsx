import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConsultasView } from "@/components/consultas/ConsultasView";
import { Suspense } from "react";

export const metadata = { title: "Mis consultas" };

export default function ConsultasPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Mis consultas"
        description="Cola de trabajo: pendientes, seguimiento y consultas que ya realizaste."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ConsultasView />
      </Suspense>
    </PageContainer>
  );
}
