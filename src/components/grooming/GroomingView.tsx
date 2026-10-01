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
import { formatDate } from "@/utils/formatDate";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function GroomingView() {
  const { clinicId, version, refresh } = useDemo();
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
  const [form, setForm] = useState({
    patientId: pets[0]?.id ?? "",
    service: "grooming_completo" as GroomingService,
    date: DEMO_TODAY,
    time: "15:00",
    professional: "Karla Ruiz",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    groomingService.create({
      ...form,
      clientId,
      clinicId,
    });
    toast("✓ Reserva de grooming creada");
    modal.closeModal();
    refresh();
  };

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
                        groomingService.updateStatus(g.id, "en_proceso");
                        refresh();
                      }}
                    >
                      Iniciar
                    </Button>
                  ) : null}
                  {g.status === "en_proceso" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        groomingService.updateStatus(g.id, "lista");
                        toast("✓ Mascota lista para entrega");
                        refresh();
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
                          groomingService.updateStatus(g.id, "entregada");
                          refresh();
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
        onClose={modal.closeModal}
        title="Nueva reserva de grooming"
        footer={
          <>
            <Button variant="outline" onClick={modal.closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="grm-form">
              Confirmar
            </Button>
          </>
        }
      >
        <form id="grm-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Cliente"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              const next = patientsService.getPatientsByClientId(e.target.value);
              setForm({ ...form, patientId: next[0]?.id ?? "" });
            }}
          />
          <Select
            label="Mascota"
            options={pets.map((p) => ({ value: p.id, label: p.name }))}
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          />
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
        </form>
      </Modal>
    </>
  );
}
