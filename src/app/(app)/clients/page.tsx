import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientsView } from "@/components/clients/ClientsView";

export const metadata = { title: "Clientes" };

export default function ClientsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Propietarios y tutores de tus pacientes."
      />
      <ClientsView />
    </PageContainer>
  );
}
