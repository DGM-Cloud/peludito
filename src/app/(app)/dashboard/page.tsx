import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageContainer>
      <DashboardView />
    </PageContainer>
  );
}
