import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FollowUpsView } from "@/components/follow-ups/FollowUpsView";

export const metadata = { title: "Seguimientos" };

export default function FollowUpsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Seguimientos pendientes"
        description="Vacunas, controles, tratamientos y no-shows."
      />
      <FollowUpsView />
    </PageContainer>
  );
}
