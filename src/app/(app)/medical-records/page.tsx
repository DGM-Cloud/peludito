import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MedicalRecordsView } from "@/components/medical-records/MedicalRecordsView";
import { Suspense } from "react";

export const metadata = { title: "Historias clínicas" };

export default function MedicalRecordsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Historias clínicas"
        description="Consultas, diagnósticos y tratamientos."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <MedicalRecordsView />
      </Suspense>
    </PageContainer>
  );
}
