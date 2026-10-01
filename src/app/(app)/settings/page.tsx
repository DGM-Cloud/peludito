import { PageContainer } from "@/components/layout/PageContainer";
import { siteConfig } from "@/config/site";
import { clinics } from "@/config/demo";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export const metadata = { title: "Configuración" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <h1 className="mb-2 text-2xl font-semibold">Configuración</h1>
      <p className="mb-6 text-sm text-muted">
        Preferencias de clínica (demo). La personalización real se define en
        discovery con cada veterinaria.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sedes" />
          <ul className="space-y-2 text-sm">
            {clinics.map((c) => (
              <li key={c.id} className="rounded-lg bg-background px-3 py-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted">{c.address}</p>
              </li>
            ))}
          </ul>
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
