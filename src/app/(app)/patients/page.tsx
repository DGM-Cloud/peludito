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
        description="Gestiona las mascotas de tu veterinaria."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <PatientsView />
      </Suspense>
    </PageContainer>
  );
}
