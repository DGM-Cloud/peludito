"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { vaccinationStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { formatDate } from "@/utils/formatDate";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function VaccinesView() {
  const { version, refresh } = useDemo();
  const { toast } = useToast();
  const router = useRouter();
  const modal = useModal();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("proximas");
  const [manualOpen, setManualOpen] = useState(false);

  const all = useMemo(
    () => vaccinationsService.getVaccinations(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const filtered = all.filter((v) => {
    if (tab === "proximas") return v.status === "proxima";
    if (tab === "vencidas") return v.status === "vencida";
    if (tab === "completadas")
      return v.status === "vigente" || v.status === "completada";
    return true;
  });

  const patients = patientsService.getPatients();
  const vets = veterinariansService.getVeterinarians();
  const patientFromUrl = searchParams.get("patient") ?? undefined;
  const formOpen = manualOpen || modal.open || Boolean(patientFromUrl);

  const [form, setForm] = useState({
    patientId: patientFromUrl ?? patients[0]?.id ?? "",
    name: "Antirrábica",
    laboratory: "BioVet Perú",
    lot: "",
    dateApplied: DEMO_TODAY,
    nextDue: "2027-09-22",
    veterinarianId: vets[0]?.id ?? "",
  });

  const closeForm = () => {
    setManualOpen(false);
    modal.closeModal();
    if (patientFromUrl) router.replace("/vaccines");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lot) {
      toast("Ingresa el número de lote");
      return;
    }
    vaccinationsService.createVaccination({
      ...form,
      patientId: patientFromUrl ?? form.patientId,
    });
    toast("✓ Vacuna registrada — seguimiento de próxima dosis creado");
    closeForm();
    refresh();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { id: "proximas", label: "Próximas" },
            { id: "vencidas", label: "Vencidas" },
            { id: "completadas", label: "Al día" },
            { id: "todas", label: "Todas" },
          ]}
          activeId={tab}
          onChange={setTab}
        />
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setManualOpen(true);
            modal.openModal();
          }}
        >
          Registrar vacuna
        </Button>
      </div>

      <Card padding={false}>
        <ul className="divide-y divide-border">
          {filtered.map((v) => {
            const patient = patientsService.getPatientById(v.patientId);
            const status = vaccinationStatuses.find((s) => s.value === v.status);
            const days =
              (new Date(v.nextDue).getTime() - new Date(DEMO_TODAY).getTime()) /
              (1000 * 60 * 60 * 24);
            return (
              <li
                key={v.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    <Link
                      href={`/patients/${v.patientId}`}
                      className="text-primary hover:underline"
                    >
                      {patient?.name}
                    </Link>
                  </p>
                  <p className="text-sm text-muted">
                    {v.name} · Lote {v.lot} · {v.laboratory}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Aplicada {formatDate(v.dateApplied)} · Próxima{" "}
                    {formatDate(v.nextDue)}
                    {v.status === "proxima"
                      ? ` · Vence en ${Math.ceil(days)} días`
                      : v.status === "vencida"
                        ? ` · Vencida hace ${Math.abs(Math.floor(days))} días`
                        : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={status?.label ?? v.status}
                    tone={
                      (status?.color as "success" | "warning" | "danger" | "muted") ??
                      "default"
                    }
                  />
                  <WhatsAppAction label="Recordar por WhatsApp" />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title="Registrar vacuna"
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" form="vac-form">
              Guardar
            </Button>
          </>
        }
      >
        <form
          id="vac-form"
          onSubmit={submit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Select
            label="Paciente"
            options={patients.map((p) => ({ value: p.id, label: p.name }))}
            value={patientFromUrl ?? form.patientId}
            disabled={Boolean(patientFromUrl)}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          />
          <Input
            label="Vacuna"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Laboratorio"
            value={form.laboratory}
            onChange={(e) => setForm({ ...form, laboratory: e.target.value })}
          />
          <Input
            label="Lote"
            required
            value={form.lot}
            onChange={(e) => setForm({ ...form, lot: e.target.value })}
          />
          <Input
            label="Fecha aplicación"
            type="date"
            value={form.dateApplied}
            onChange={(e) => setForm({ ...form, dateApplied: e.target.value })}
          />
          <Input
            label="Próxima dosis"
            type="date"
            value={form.nextDue}
            onChange={(e) => setForm({ ...form, nextDue: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Select
              label="Veterinario"
              options={vets.map((v) => ({ value: v.id, label: v.name }))}
              value={form.veterinarianId}
              onChange={(e) =>
                setForm({ ...form, veterinarianId: e.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
