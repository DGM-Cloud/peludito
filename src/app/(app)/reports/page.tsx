import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";

export const metadata = { title: "Reportes" };

export default function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Reportes"
        description="Cada indicador responde una pregunta operativa."
      />
      <ReportsView />
    </PageContainer>
  );
}
