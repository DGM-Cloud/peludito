import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import { calculateAge } from "@/utils/calculateAge";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = clientsService.getClientById(id);
  return { title: client?.name ?? "Cliente" };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = clientsService.getClientById(id);
  if (!client) notFound();

  const pets = patientsService.getPatientsByClientId(client.id);
  const sales = salesService.getSalesByClientId(client.id);

  return (
    <PageContainer>
      <Link href="/clients" className="text-sm text-primary hover:underline">
        ← Volver a clientes
      </Link>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatPhone(client.phone)} · {client.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/patients?client=${client.id}`}>
            <Button size="sm">Nueva mascota</Button>
          </Link>
          <Link href={`/appointments?client=${client.id}`}>
            <Button size="sm" variant="outline">
              Nueva cita
            </Button>
          </Link>
          <Link href={`/pos?client=${client.id}`}>
            <Button size="sm" variant="secondary">
              Nueva venta
            </Button>
          </Link>
          <WhatsAppAction />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Resumen" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Teléfono</dt>
              <dd>{formatPhone(client.phone)}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{client.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Dirección</dt>
              <dd>{client.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Última visita</dt>
              <dd>{client.lastVisit ? formatDate(client.lastVisit) : "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Mascotas" />
          <ul className="space-y-3">
            {pets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/patients/${p.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-muted">
                  {p.breed} · {calculateAge(p.birthDate)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Compras / pagos" />
          {sales.length === 0 ? (
            <p className="text-sm text-muted">Sin ventas registradas.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {sales.map((s) => (
                <li key={s.id} className="flex justify-between">
                    <span>
                      {formatDate(s.date)} ·{" "}
                      {s.paymentMethod === "yape"
                        ? "Yape"
                        : s.paymentMethod === "plin"
                          ? "Plin"
                          : s.paymentMethod === "tarjeta"
                            ? "Tarjeta"
                            : "Efectivo"}
                    </span>
                  <span className="font-medium">{formatCurrency(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
