"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatCard";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { groomingServices, groomingStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { groomingService } from "@/services/grooming.service";
import { patientsService } from "@/services/patients.service";
import type { GroomingService } from "@/types/grooming";
import { formatDate, formatLongDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { groomingShareText, whatsappHref } from "@/utils/whatsapp";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function GroomingView() {
  const { clinicId, clinic, version, refresh } = useDemo();
  const { toast } = useToast();
  const modal = useModal();

  const items = useMemo(
    () => groomingService.getAll(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const clients = clientsService.getClients();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const pets = patientsService.getPatientsByClientId(clientId);
  const [patientIds, setPatientIds] = useState<string[]>(pets[0] ? [pets[0].id] : []);
  const [form, setForm] = useState({
    service: "grooming_completo" as GroomingService,
    date: DEMO_TODAY,
    time: "15:00",
    professional: "Karla Ruiz",
  });
  const [shareNames, setShareNames] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const closeModal = () => {
    setShareNames(null);
    setError("");
    modal.closeModal();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientIds.length === 0) return;
    setSaving(true);
    setError("");
    const saved: string[] = [];
    try {
      for (const patientId of patientIds) {
        await groomingService.create({
          patientId,
          service: form.service,
          date: form.date,
          time: form.time,
          professional: form.professional,
          clientId,
          clinicId,
        });
        saved.push(patientsService.getPatientById(patientId)?.name ?? "Mascota");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la reserva");
    } finally {
      setSaving(false);
    }
    if (saved.length === 0) return;
    await refresh();
    setShareNames(saved);
    if (saved.length < patientIds.length) {
      setError(
        (current) =>
          `${current} ${saved.join(", ")} sí quedaron agendadas.`.trim(),
      );
    }
  };

  const selectedClient = clientsService.getClientById(clientId);
  const serviceName =
    groomingServices.find((item) => item.value === form.service)?.label ?? "Grooming";
  const shareMessage = shareNames
    ? groomingShareText({
        clinicName: clinic.name,
        clientName: selectedClient?.name ?? "",
        serviceName,
        dateLabel: formatLongDate(form.date),
        time: form.time,
        professional: form.professional,
        petNames: shareNames,
      })
    : "";
  const whatsappLink = shareMessage
    ? whatsappHref(selectedClient?.phone ?? "", shareMessage)
    : "";

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nueva reserva
        </Button>
      </div>

      <Card padding={false}>
        <ul className="divide-y divide-border">
          {items.map((g) => {
            const patient = patientsService.getPatientById(g.patientId);
            const client = clientsService.getClientById(g.clientId);
            const svc = groomingServices.find((s) => s.value === g.service);
            return (
              <li
                key={g.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    <Link
                      href={`/patients/${g.patientId}`}
                      className="text-primary hover:underline"
                    >
                      {patient?.name}
                    </Link>{" "}
                    · {svc?.label}
                  </p>
                  <p className="text-xs text-muted">
                    {client?.name} · {formatDate(g.date)} {g.time} ·{" "}
                    {g.professional}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={
                      groomingStatuses.find((s) => s.value === g.status)?.label ??
                      g.status
                    }
                    tone={
                      (groomingStatuses.find((s) => s.value === g.status)
                        ?.color as
                        | "success"
                        | "warning"
                        | "primary"
                        | "danger"
                        | "muted") ?? "default"
                    }
                  />
                  {g.status === "programada" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void groomingService.updateStatus(g.id, "en_proceso").then(() => refresh());
                      }}
                    >
                      Iniciar
                    </Button>
                  ) : null}
                  {g.status === "en_proceso" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        void groomingService.updateStatus(g.id, "lista").then(() => {
                          toast("✓ Mascota lista para entrega");
                          return refresh();
                        });
                      }}
                    >
                      Marcar lista
                    </Button>
                  ) : null}
                  {g.status === "lista" ? (
                    <>
                      <Link
                        href={`/pos?client=${g.clientId}&patient=${g.patientId}&grooming=${g.id}`}
                      >
                        <Button size="sm" variant="outline">
                          Cobrar
                        </Button>
                      </Link>
                      <WhatsAppAction label="Avisar que está lista" />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void groomingService.updateStatus(g.id, "entregada").then(() => refresh());
                        }}
                      >
                        Entregar
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={shareNames ? "Reserva lista" : "Nueva reserva de grooming"}
        footer={
          shareNames ? (
            <Button onClick={closeModal}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" form="grm-form" disabled={saving || patientIds.length === 0}>
                {saving
                  ? "Guardando…"
                  : patientIds.length > 1
                    ? `Confirmar ${patientIds.length} reservas`
                    : "Confirmar"}
              </Button>
            </>
          )
        }
      >
        {shareNames ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {shareNames.length === 1
                ? `${shareNames[0]} quedó para ${serviceName} el ${formatLongDate(form.date)} a las ${form.time}.`
                : `${shareNames.join(", ")} quedaron para ${serviceName} el ${formatLongDate(form.date)} a las ${form.time}.`}
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="rounded-xl bg-background px-3 py-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{shareMessage}</p>
            </div>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button>Enviar por WhatsApp</Button>
              </a>
            ) : (
              <p className="text-sm text-muted">
                Este cliente no tiene un celular válido para WhatsApp. Comparte el mensaje de otra forma.
              </p>
            )}
          </div>
        ) : (
        <form id="grm-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Cliente"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={clientId}
            onChange={(e) => {
              const nextId = e.target.value;
              setClientId(nextId);
              const next = patientsService.getPatientsByClientId(nextId);
              setPatientIds(next.length === 1 ? [next[0].id] : []);
            }}
          />
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-foreground">Mascotas</p>
            {pets.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Este cliente no tiene mascotas.</p>
            ) : (
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {pets.map((pet) => {
                  const selected = patientIds.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setPatientIds((current) =>
                          current.includes(pet.id)
                            ? current.filter((id) => id !== pet.id)
                            : [...current, pet.id],
                        )
                      }
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-surface hover:border-primary/40",
                      )}
                    >
                      <span className="block text-sm font-medium">{pet.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {patientIds.length > 1 ? (
              <p className="mt-2 text-xs text-muted">Se agendan a la misma hora.</p>
            ) : null}
          </div>
          <Select
            label="Servicio"
            options={groomingServices.map((s) => ({
              value: s.value,
              label: `${s.label} — S/ ${s.price}`,
            }))}
            value={form.service}
            onChange={(e) =>
              setForm({ ...form, service: e.target.value as GroomingService })
            }
          />
          <Input
            label="Profesional"
            value={form.professional}
            onChange={(e) => setForm({ ...form, professional: e.target.value })}
          />
          <Input
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Hora"
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          {error ? <p className="sm:col-span-2 text-sm text-danger">{error}</p> : null}
        </form>
        )}
      </Modal>
    </>
  );
}
