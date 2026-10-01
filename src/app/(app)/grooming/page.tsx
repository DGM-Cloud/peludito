import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { GroomingView } from "@/components/grooming/GroomingView";

export const metadata = { title: "Grooming" };

export default function GroomingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Grooming"
        description="Reservas de baño, corte y grooming completo."
      />
      <GroomingView />
    </PageContainer>
  );
}
