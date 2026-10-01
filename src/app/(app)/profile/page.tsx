import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <PageContainer>
      <h1 className="mb-6 text-2xl font-semibold">Perfil</h1>
      <Card className="flex items-center gap-4">
        <Avatar initials={siteConfig.demoUser.initials} size="lg" />
        <div>
          <p className="text-lg font-semibold">{siteConfig.demoUser.name}</p>
          <p className="text-sm text-muted">{siteConfig.demoUser.role}</p>
          <p className="mt-1 text-xs text-muted">
            Demo — {siteConfig.productName} by {siteConfig.companyName}
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
