import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PatientsView } from "@/components/patients/PatientsView";
import { Suspense } from "react";

export const metadata = { title: "Pacientes" };

export default function PatientsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Pacientes"
        description="Fichas de las mascotas, con tutor, vacunas y alertas."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <PatientsView />
      </Suspense>
    </PageContainer>
  );
}
