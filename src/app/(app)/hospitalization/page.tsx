import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { HospitalizationView } from "@/components/hospitalization/HospitalizationView";

export const metadata = { title: "Hospitalización" };

export default function HospitalizationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Hospitalización"
        description="Pacientes internados, jaulas y evolución clínica."
      />
      <HospitalizationView />
    </PageContainer>
  );
}
