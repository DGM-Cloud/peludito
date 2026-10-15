"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ServiceCatalogSettings } from "@/components/settings/ServiceCatalogSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useDemo } from "@/context/DemoProvider";

export default function SettingsPage() {
  const { clinic } = useDemo();

  return (
    <PageContainer>
      <h1 className="mb-2 text-2xl font-semibold">Configuración</h1>
      <p className="mb-6 text-sm text-muted">
        La sede activa sale del perfil con el que iniciaste sesión.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <TeamSettings />
        <ServiceCatalogSettings />
        <Card>
          <CardHeader title="Sede" />
          <div className="rounded-lg bg-background px-3 py-2 text-sm">
            <p className="font-medium">{clinic.name}</p>
            <p className="text-muted">{clinic.address}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Integraciones futuras" />
          <ul className="space-y-2 text-sm text-muted">
            <li>WhatsApp Business — próxima implementación</li>
            <li>Comprobantes electrónicos SUNAT — modo demo en Caja</li>
            <li>Trazabilidad / SENASA — estructura preparada, sin cumplimiento afirmado</li>
          </ul>
          <a
            href={siteConfig.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block"
          >
            <Button>Hablar con DGM Cloud</Button>
          </a>
        </Card>
      </div>
    </PageContainer>
  );
}
