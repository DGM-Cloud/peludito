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
        description="Archivo clínico por paciente: diagnósticos, tratamientos y evolución. Para atender, usa Mis consultas."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <MedicalRecordsView />
      </Suspense>
    </PageContainer>
  );
}
