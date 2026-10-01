"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { catalogServices, DEMO_TODAY } from "@/config/demo";
import { paymentMethods } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { groomingService } from "@/services/grooming.service";
import { inventoryService } from "@/services/inventory.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import type { PaymentMethod, SaleItem, VoucherType } from "@/types/sale";
import { formatCurrency } from "@/utils/formatCurrency";
import { Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type PosPrefill = {
  clientId: string;
  patientId: string;
  appointmentId: string | null;
  groomingId: string | null;
  items: SaleItem[];
  banner: string;
};

function buildPosPrefill(
  searchParams: URLSearchParams,
  defaultClientId: string,
): PosPrefill {
  const aptId = searchParams.get("appointment");
  const clientParam = searchParams.get("client");
  const patientParam = searchParams.get("patient");
  const grmId = searchParams.get("grooming");

  if (aptId) {
    const apt = appointmentsService.getAppointmentById(aptId);
    if (apt) {
      const svc =
        catalogServices.find((s) => s.category === apt.serviceType) ??
        catalogServices.find((s) => s.id === "svc-1");
      const patient = patientsService.getPatientById(apt.patientId);
      const client = clientsService.getClientById(apt.clientId);
      return {
        clientId: apt.clientId,
        patientId: apt.patientId,
        appointmentId: apt.id,
        groomingId: null,
        items: svc
          ? [
              {
                id: `item-apt-${apt.id}`,
                type: "servicio",
                referenceId: svc.id,
                name: `${svc.name} — ${apt.reason}`,
                quantity: 1,
                unitPrice: svc.price,
                total: svc.price,
              },
            ]
          : [],
        banner: `Cobrando cita de ${patient?.name ?? "paciente"} · ${client?.name ?? ""} · ${apt.time} · ${apt.reason}`,
      };
    }
  }

  if (grmId) {
    const grm = groomingService.getAll().find((g) => g.id === grmId);
    if (grm) {
      const priceMap: Record<string, string> = {
        bano: "svc-6",
        corte: "svc-5",
        bano_medicado: "svc-6",
        corte_unas: "svc-cut",
        grooming_completo: "svc-5",
      };
      const svc =
        catalogServices.find((s) => s.id === priceMap[grm.service]) ??
        catalogServices.find((s) => s.id === "svc-5");
      const patient = patientsService.getPatientById(grm.patientId);
      return {
        clientId: grm.clientId,
        patientId: grm.patientId,
        appointmentId: null,
        groomingId: grm.id,
        items: svc
          ? [
              {
                id: `item-grm-${grm.id}`,
                type: "servicio",
                referenceId: svc.id,
                name: svc.name,
                quantity: 1,
                unitPrice: svc.price,
                total: svc.price,
              },
            ]
          : [],
        banner: `Cobrando grooming de ${patient?.name ?? "mascota"} · ${grm.time}`,
      };
    }
  }

  if (clientParam) {
    return {
      clientId: clientParam,
      patientId: patientParam ?? "",
      appointmentId: null,
      groomingId: null,
      items: [],
      banner: "Venta precargada desde ficha de paciente/cliente",
    };
  }

  return {
    clientId: defaultClientId,
    patientId: "",
    appointmentId: null,
    groomingId: null,
    items: [],
    banner: "",
  };
}

export function PosView() {
  const { clinicId, refresh, version } = useDemo();
  const { toast } = useToast();
  const voucherModal = useModal();
  const searchParams = useSearchParams();

  const cash = useMemo(
    () => salesService.getCashSummary(DEMO_TODAY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const daySales = useMemo(
    () => salesService.getSalesByDate(DEMO_TODAY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const clients = clientsService.getClients();
  const products = inventoryService.getProducts();
  const defaultClientId = clients[0]?.id ?? "";

  const prefillKey = searchParams.toString();
  const prefill = buildPosPrefill(searchParams, defaultClientId);

  const [appliedKey, setAppliedKey] = useState(prefillKey);
  const [clientId, setClientId] = useState(prefill.clientId);
  const [patientId, setPatientId] = useState(prefill.patientId);
  const [appointmentId, setAppointmentId] = useState(prefill.appointmentId);
  const [groomingId, setGroomingId] = useState(prefill.groomingId);
  const [items, setItems] = useState<SaleItem[]>(prefill.items);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [voucherType, setVoucherType] = useState<VoucherType>("boleta");
  const [documentNumber, setDocumentNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [contextBanner, setContextBanner] = useState(prefill.banner);

  if (appliedKey !== prefillKey) {
    setAppliedKey(prefillKey);
    setClientId(prefill.clientId);
    setPatientId(prefill.patientId);
    setAppointmentId(prefill.appointmentId);
    setGroomingId(prefill.groomingId);
    setItems(prefill.items);
    setContextBanner(prefill.banner);
  }

  const pets = patientsService.getPatientsByClientId(clientId);

  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const total = Math.max(0, subtotal - discount);

  const addService = (svcId: string) => {
    const svc = catalogServices.find((s) => s.id === svcId);
    if (!svc) return;
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        type: "servicio",
        referenceId: svc.id,
        name: svc.name,
        quantity: 1,
        unitPrice: svc.price,
        total: svc.price,
      },
    ]);
  };

  const addProduct = (prdId: string) => {
    const prd = products.find((p) => p.id === prdId);
    if (!prd) return;
    if (prd.stock <= 0) {
      toast("Producto sin stock");
      return;
    }
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.type === "producto" && i.referenceId === prdId,
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unitPrice,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}`,
          type: "producto",
          referenceId: prd.id,
          name: prd.name,
          quantity: 1,
          unitPrice: prd.price,
          total: prd.price,
        },
      ];
    });
  };

  const confirmSale = () => {
    if (!clientId || items.length === 0) {
      toast("Agrega al menos un ítem y un cliente");
      return;
    }
    if (voucherType === "factura" && (!documentNumber || !businessName)) {
      toast("Para factura se requiere RUC y razón social");
      return;
    }
    const sale = salesService.createSale({
      date: DEMO_TODAY,
      time: new Date().toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      clientId,
      patientId: patientId || undefined,
      clinicId,
      items,
      subtotal,
      discount,
      total,
      paymentMethod,
      voucherType,
      documentNumber: documentNumber || undefined,
      businessName: businessName || undefined,
      appointmentId: appointmentId ?? undefined,
    });

    if (appointmentId) {
      appointmentsService.updateStatus(appointmentId, "pagada");
      appointmentsService.updateAppointment(appointmentId, {
        saleId: sale.id,
      });
    }

    if (groomingId) {
      groomingService.updateStatus(groomingId, "entregada");
    }

    setLastSaleId(sale.id);
    setItems([]);
    setDiscount(0);
    setAppointmentId(null);
    setGroomingId(null);
    setContextBanner("");
    refresh();
    toast("✓ Venta registrada — inventario y cita actualizados");
    if (voucherType !== "ninguno") voucherModal.openModal();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {contextBanner ? (
          <div className="rounded-xl border border-primary/30 bg-primary-light/50 px-4 py-3 text-sm text-primary">
            {contextBanner}
          </div>
        ) : null}

        <Card>
          <CardHeader title="Nueva venta" description="Servicios y productos" />
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Cliente"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                const next = patientsService.getPatientsByClientId(
                  e.target.value,
                );
                setPatientId(next[0]?.id ?? "");
              }}
            />
            <Select
              label="Mascota (opcional)"
              options={[
                { value: "", label: "Sin mascota" },
                ...pets.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Agregar servicio"
              options={[
                { value: "", label: "Seleccionar…" },
                ...catalogServices.map((s) => ({
                  value: s.id,
                  label: `${s.name} — ${formatCurrency(s.price)}`,
                })),
              ]}
              value=""
              onChange={(e) => {
                if (e.target.value) addService(e.target.value);
              }}
            />
            <Select
              label="Agregar producto"
              options={[
                { value: "", label: "Seleccionar…" },
                ...products.map((p) => ({
                  value: p.id,
                  label: `${p.name} (stock ${p.stock}) — ${formatCurrency(p.price)}`,
                })),
              ]}
              value=""
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
              }}
            />
          </div>

          <ul className="mb-4 divide-y divide-border rounded-lg border border-border">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">
                Agrega servicios o productos para cobrar.
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs capitalize text-muted">
                      {item.type} · Cant. {item.quantity} ·{" "}
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {formatCurrency(item.total)}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar ítem"
                      onClick={() =>
                        setItems((prev) =>
                          prev.filter((i) => i.id !== item.id),
                        )
                      }
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Descuento (S/)"
              type="number"
              min={0}
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
            <Select
              label="Método de pago"
              options={paymentMethods.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethod)
              }
            />
            <Select
              label="Comprobante"
              options={[
                { value: "ninguno", label: "Sin comprobante" },
                { value: "boleta", label: "Boleta" },
                { value: "factura", label: "Factura" },
              ]}
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value as VoucherType)}
            />
            {voucherType === "boleta" ? (
              <Input
                label="DNI"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="8 dígitos"
              />
            ) : null}
            {voucherType === "factura" ? (
              <>
                <Input
                  label="RUC"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
                <Input
                  label="Razón social"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted">
                Subtotal {formatCurrency(subtotal)}
                {discount > 0 ? ` − desc. ${formatCurrency(discount)}` : ""}
              </p>
              <p className="text-xl font-semibold">{formatCurrency(total)}</p>
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={confirmSale}
              disabled={items.length === 0}
            >
              Confirmar venta
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ventas del día" />
          <ul className="divide-y divide-border">
            {daySales.map((s) => (
              <li key={s.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {clientsService.getClientById(s.clientId)?.name}
                  </p>
                  <p className="text-xs text-muted">
                    {s.time} ·{" "}
                    {paymentMethods.find((p) => p.value === s.paymentMethod)
                      ?.label ?? s.paymentMethod}{" "}
                    · {s.voucherType}
                    {s.voucherNumber ? ` · ${s.voucherNumber}` : ""}
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(s.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Caja del día" description={DEMO_TODAY} />
        <dl className="space-y-3 text-sm">
          <Row label="Efectivo" value={cash.efectivo} />
          <Row label="Yape" value={cash.yape} />
          <Row label="Plin" value={cash.plin} />
          <Row label="Tarjeta" value={cash.tarjeta} />
          <div className="border-t border-border pt-3">
            <Row label="TOTAL" value={cash.total} bold />
          </div>
          <p className="text-xs text-muted">{cash.count} ventas registradas</p>
        </dl>
      </Card>

      <Modal
        open={voucherModal.open}
        onClose={voucherModal.closeModal}
        title="Comprobante generado (DEMO)"
        footer={
          <Button onClick={voucherModal.closeModal}>Entendido</Button>
        }
      >
        <p className="rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
          Modo demostración — integración SUNAT no conectada.
        </p>
        <p className="mt-4 text-sm text-muted">
          Se generó un comprobante simulado
          {lastSaleId
            ? ` para la venta ${salesService.getSaleById(lastSaleId)?.voucherNumber ?? lastSaleId}`
            : ""}
          .
        </p>
      </Modal>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={bold ? "font-semibold" : ""}>{formatCurrency(value)}</dd>
    </div>
  );
}
