import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import { Suspense } from "react";

export const metadata = { title: "Citas" };

export default function AppointmentsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Citas"
        description="Agenda visual de tu veterinaria."
      />
      <Suspense fallback={<p className="text-sm text-muted">Cargando agenda…</p>}>
        <AppointmentsView />
      </Suspense>
    </PageContainer>
  );
}
