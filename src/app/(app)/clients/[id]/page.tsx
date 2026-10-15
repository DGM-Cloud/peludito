"use client";

import { ClientForm } from "@/components/clients/ClientForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { useToast } from "@/components/ui/Toast";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import { channelOptions, relationshipOptions } from "@/utils/client-fields";
import { formatPatientAge } from "@/utils/patient-fields";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { version, refresh } = useDemo();
  const { toast } = useToast();
  const editModal = useModal();
  void version;
  const client = clientsService.getClientById(id);

  if (!client) {
    return (
      <PageContainer>
        <p className="text-sm text-muted">Cliente no encontrado.</p>
      </PageContainer>
    );
  }

  const pets = patientsService.getPatientsByClientId(client.id);
  const sales = salesService.getSalesByClientId(client.id);
  const channel =
    channelOptions.find((item) => item.value === client.preferredChannel)?.label ?? "WhatsApp";
  const relationship =
    relationshipOptions.find((item) => item.value === client.relationship)?.label ?? "Propietario";
  const place = [client.district, client.province, client.department].filter(Boolean).join(", ");
  const allows = [
    client.allowCall ? "llamadas" : "",
    client.allowWhatsapp ? "WhatsApp" : "",
    client.allowEmail ? "correo" : "",
  ].filter(Boolean);

  const nameParts = client.name.trim().split(/\s+/).filter(Boolean);
  const initials = `${nameParts[0]?.charAt(0) ?? ""}${
    nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) ?? "" : ""
  }`.toUpperCase();
  const spent = sales.reduce((total, sale) => total + sale.total, 0);

  return (
    <PageContainer>
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar initials={initials || "?"} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                <Badge variant="primary">{relationship}</Badge>
                {client.status === "inactivo" ? <Badge variant="muted">Inactivo</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted">
                {[
                  client.phone ? formatPhone(client.phone) : "Sin teléfono",
                  client.email || "Sin correo",
                  place,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={editModal.openModal}>
              Editar ficha
            </Button>
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
        <div className="grid grid-cols-3 border-t border-border">
          <div className="px-5 py-3">
            <p className="text-xs text-muted">Mascotas</p>
            <p className="mt-0.5 text-lg font-semibold">{pets.length}</p>
          </div>
          <div className="border-l border-border px-5 py-3">
            <p className="text-xs text-muted">Última visita</p>
            <p className="mt-0.5 text-lg font-semibold">
              {client.lastVisit ? formatDate(client.lastVisit) : "—"}
            </p>
          </div>
          <div className="border-l border-border px-5 py-3">
            <p className="text-xs text-muted">Compras</p>
            <p className="mt-0.5 text-lg font-semibold">{spent ? formatCurrency(spent) : "—"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Resumen" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Relación</dt>
              <dd>
                {relationship}
                {client.status === "inactivo" ? " · Inactivo" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Documento</dt>
              <dd>
                {client.documentType && client.documentNumber
                  ? `${client.documentType} ${client.documentNumber}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Facturación</dt>
              <dd>
                {client.ruc
                  ? `Boleta o factura · RUC ${client.ruc}${client.businessName ? ` · ${client.businessName}` : ""}`
                  : "Solo boleta, como persona natural"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Teléfono</dt>
              <dd>
                {client.phone ? formatPhone(client.phone) : "—"}
                {client.phoneAlt ? ` · ${formatPhone(client.phoneAlt)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{client.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Canal y avisos</dt>
              <dd>
                {channel}
                {allows.length ? ` · Acepta ${allows.join(", ")}` : " · Sin autorizaciones"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Dirección</dt>
              <dd>
                {[client.address, place].filter(Boolean).join(" · ") || "—"}
                {client.addressReference ? ` (${client.addressReference})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Última visita</dt>
              <dd>{client.lastVisit ? formatDate(client.lastVisit) : "—"}</dd>
            </div>
            {client.createdByName ? (
              <div>
                <dt className="text-muted">Registro</dt>
                <dd>
                  {client.createdByName}
                  {client.createdAt ? ` · ${formatDate(client.createdAt)}` : ""}
                  {client.updatedByName
                    ? `. Último cambio: ${client.updatedByName}${client.updatedAt ? ` · ${formatDate(client.updatedAt)}` : ""}`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Mascotas" />
          {pets.length === 0 ? (
            <p className="text-sm text-muted">Todavía no tiene mascotas vinculadas.</p>
          ) : (
            <ul className="space-y-2">
              {pets.map((pet) => (
                <li key={pet.id}>
                  <Link
                    href={`/patients/${pet.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary-light/30"
                  >
                    <span>
                      <span className="block font-medium text-foreground">{pet.name}</span>
                      <span className="text-xs text-muted">
                        {pet.breed || "Sin raza"} · {formatPatientAge(pet)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(client.contacts ?? []).length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm font-medium">Contactos autorizados</p>
              <ul className="mt-2 space-y-2 text-sm">
                {(client.contacts ?? []).map((contact) => (
                  <li key={contact.id}>
                    <span className="font-medium">{contact.name}</span>
                    <p className="text-xs text-muted">
                      {relationshipOptions.find((item) => item.value === contact.relationship)?.label}{" "}
                      · {contact.phone ? formatPhone(contact.phone) : "Sin teléfono"}
                      {contact.status === "inactivo" ? " · Inactivo" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Compras / pagos" />
          {sales.length === 0 ? (
            <p className="text-sm text-muted">Sin ventas registradas.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {sales.map((sale) => (
                <li key={sale.id} className="flex justify-between">
                  <span>
                    {formatDate(sale.date)} ·{" "}
                    {sale.paymentMethod === "yape"
                      ? "Yape"
                      : sale.paymentMethod === "plin"
                        ? "Plin"
                        : sale.paymentMethod === "tarjeta"
                          ? "Tarjeta"
                          : "Efectivo"}
                  </span>
                  <span className="font-medium">{formatCurrency(sale.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ClientForm
        open={editModal.open}
        client={client}
        onClose={editModal.closeModal}
        onSaved={async () => {
          editModal.closeModal();
          toast("✓ Ficha actualizada");
          await refresh();
        }}
      />
    </PageContainer>
  );
}
