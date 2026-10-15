"use client";

import { VaccinationForm } from "@/components/vaccines/VaccinationForm";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard, StatusBadge } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { vaccinationStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Vaccination } from "@/types/vaccination";
import { formatDate, formatLongDate } from "@/utils/formatDate";
import { vaccineReminderText, whatsappHref } from "@/utils/whatsapp";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Plus,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type FormMode = "create" | "edit" | "booster";

export function VaccinesView() {
  const { version, refresh, publish, clinic } = useDemo();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("proximas");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editing, setEditing] = useState<Vaccination | null>(null);
  const [detail, setDetail] = useState<Vaccination | null>(null);

  const patientFromUrl = searchParams.get("patient") ?? undefined;
  const recordFromUrl = searchParams.get("record") ?? undefined;

  const all = useMemo(
    () => vaccinationsService.getVaccinations(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const kpis = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      proximas: all.filter((v) => v.status === "proxima").length,
      vencidas: all.filter((v) => v.status === "vencida").length,
      mes: all.filter((v) => v.dateApplied.startsWith(month)).length,
    };
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return all.filter((v) => {
      if (tab === "proximas" && v.status !== "proxima") return false;
      if (tab === "vencidas" && v.status !== "vencida") return false;
      if (tab === "aldia" && v.status !== "vigente" && v.status !== "completada") {
        return false;
      }
      const patient = patientsService.getPatientById(v.patientId);
      return (
        !q ||
        patient?.name.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.lot.toLowerCase().includes(q)
      );
    });
  }, [all, tab, query]);

  const openCreate = () => {
    setEditing(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const openEdit = (item: Vaccination) => {
    setEditing(item);
    setFormMode("edit");
    setFormOpen(true);
  };

  const openBooster = (item: Vaccination) => {
    setEditing(item);
    setFormMode("booster");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    if (patientFromUrl || recordFromUrl) {
      router.replace("/vaccines");
    }
  };

  const completeSeries = async (item: Vaccination) => {
    try {
      await vaccinationsService.completeSeries(item.id);
      toast("✓ Serie marcada como completa");
      publish();
      void refresh();
      setDetail(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo completar.");
    }
  };

  const notifyOwner = (item: Vaccination) => {
    const patient = patientsService.getPatientById(item.patientId);
    const client = patient
      ? clientsService.getClientById(patient.clientId)
      : undefined;
    const href = whatsappHref(
      client?.phone ?? "",
      vaccineReminderText({
        clinicName: clinic.name,
        clientName: client?.name ?? "",
        petName: patient?.name ?? "tu mascota",
        vaccineName: item.name,
        nextDueLabel: formatLongDate(item.nextDue),
        status: item.status,
      }),
    );
    if (!href) {
      toast("El tutor no tiene un celular válido para WhatsApp.");
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Próximas (7 días)"
          value={kpis.proximas}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Vencidas"
          value={kpis.vencidas}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Aplicadas este mes"
          value={kpis.mes}
          icon={<Syringe className="h-5 w-5" />}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          tabs={[
            { id: "proximas", label: "Próximas" },
            { id: "vencidas", label: "Vencidas" },
            { id: "aldia", label: "Al día" },
            { id: "todas", label: "Todas" },
          ]}
          activeId={tab}
          onChange={setTab}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Buscar mascota, vacuna o lote…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar vacunas"
          />
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Registrar vacuna
          </Button>
        </div>
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No hay vacunas en esta vista.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item) => {
              const patient = patientsService.getPatientById(item.patientId);
              const vet = veterinariansService.getVeterinarianById(
                item.veterinarianId,
              );
              const status = vaccinationStatuses.find(
                (s) => s.value === item.status,
              );
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/patients/${item.patientId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {patient?.name ?? "Paciente"}
                      </Link>
                      <StatusBadge
                        label={status?.label ?? item.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "danger"
                            | "muted"
                            | "primary") ?? "default"
                        }
                      />
                    </div>
                    <p className="mt-1 text-sm text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Lote {item.lot}
                      {item.laboratory ? ` · ${item.laboratory}` : ""}
                      {" · "}Aplicada {formatDate(item.dateApplied)}
                      {" · "}Próxima {formatDate(item.nextDue)}
                      {vet?.name ? ` · ${vet.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetail(item)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      Editar
                    </Button>
                    {item.seriesStatus !== "completada" ? (
                      <Button
                        size="sm"
                        onClick={() => openBooster(item)}
                      >
                        Refuerzo
                      </Button>
                    ) : null}
                    {(item.status === "proxima" || item.status === "vencida") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => notifyOwner(item)}
                      >
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {detail ? (
        <Card className="mt-4">
          <CardHeader
            title={detail.name}
            description={`Aplicada ${formatDate(detail.dateApplied)}`}
            action={
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>
                Cerrar
              </Button>
            }
          />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Paciente">
              <Link
                href={`/patients/${detail.patientId}`}
                className="text-primary hover:underline"
              >
                {patientsService.getPatientById(detail.patientId)?.name ?? "—"}
              </Link>
            </Detail>
            <Detail
              label="Estado"
              value={
                vaccinationStatuses.find((s) => s.value === detail.status)?.label ??
                detail.status
              }
            />
            <Detail label="Laboratorio" value={detail.laboratory || "—"} />
            <Detail label="Lote" value={detail.lot} />
            <Detail
              label="Vencimiento lote"
              value={detail.lotExpiry ? formatDate(detail.lotExpiry) : "—"}
            />
            <Detail label="Próxima dosis" value={formatDate(detail.nextDue)} />
            <Detail label="Vía" value={detail.route} />
            <Detail label="Sitio" value={detail.site || "—"} />
            <Detail
              label="Dosis"
              value={detail.doseMl != null ? `${detail.doseMl} ml` : "—"}
            />
            <Detail
              label="Veterinario"
              value={
                veterinariansService.getVeterinarianById(detail.veterinarianId)
                  ?.name ?? "—"
              }
            />
            {detail.notes ? (
              <div className="sm:col-span-2">
                <Detail label="Notas" value={detail.notes} />
              </div>
            ) : null}
            {detail.medicalRecordId ? (
              <div className="sm:col-span-2">
                <Detail label="Historial">
                  <Link
                    href={`/medical-records?highlight=${detail.medicalRecordId}`}
                    className="text-primary hover:underline"
                  >
                    Ver entrada clínica vinculada
                  </Link>
                </Detail>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button size="sm" variant="outline" onClick={() => openEdit(detail)}>
              Editar
            </Button>
            {detail.seriesStatus !== "completada" ? (
              <>
                <Button size="sm" onClick={() => openBooster(detail)}>
                  Aplicar refuerzo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => void completeSeries(detail)}
                >
                  Marcar serie completa
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <VaccinationForm
        key={`${formMode}-${editing?.id ?? "new"}-${patientFromUrl ?? ""}-${formOpen}`}
        open={formOpen || Boolean(patientFromUrl)}
        mode={patientFromUrl && !editing ? "create" : formMode}
        initial={editing}
        lockedPatientId={patientFromUrl}
        lockedRecordId={recordFromUrl}
        onClose={closeForm}
        onSaved={() => {
          publish();
          void refresh();
        }}
      />
    </>
  );
}

function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children ?? value}</dd>
    </div>
  );
}
