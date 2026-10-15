"use client";

import { MedicalRecordForm } from "@/components/medical-records/MedicalRecordForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { medicalRecordStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { appointmentsService } from "@/services/appointments.service";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type {
  CreateMedicalRecordInput,
  MedicalRecord,
  MedicalRecordStatus,
} from "@/types/medical-record";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type WorkTab = "abierta" | "seguimiento" | "cerrada";

const tabs: { id: WorkTab; label: string }[] = [
  { id: "abierta", label: "Pendientes" },
  { id: "seguimiento", label: "Seguimiento" },
  { id: "cerrada", label: "Realizadas" },
];

export function ConsultasView() {
  const { version, refresh, publish, role, veterinarianId } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useModal();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<WorkTab>("abierta");
  const [filterVetId, setFilterVetId] = useState<string>("");
  const [manualEdit, setManualEdit] = useState<MedicalRecord | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const isAdmin = role === "administrador";
  const myVetId = veterinarianId;

  const records = useMemo(
    () => medicalRecordsService.getMedicalRecords(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const vets = useMemo(
    () => veterinariansService.getVeterinarians(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const recordId = searchParams.get("record");
  const patientId = searchParams.get("patient");
  const appointmentId = searchParams.get("appointment");

  const urlRecord = recordId
    ? medicalRecordsService.getMedicalRecordById(recordId)
    : null;
  const urlApt = appointmentId
    ? appointmentsService.getAppointmentById(appointmentId)
    : null;

  const urlPrefills = urlApt
    ? {
        patientId: urlApt.patientId,
        vetId: urlApt.veterinarianId,
        reason: urlApt.reason,
      }
    : patientId
      ? { patientId, vetId: myVetId ?? undefined }
      : {};

  const editing = manualEdit ?? urlRecord ?? null;
  const open =
    manualOpen ||
    modal.open ||
    Boolean(urlRecord) ||
    Boolean(urlApt) ||
    Boolean(patientId);

  const scoped = useMemo(() => {
    if (isAdmin) {
      if (filterVetId) return records.filter((r) => r.veterinarianId === filterVetId);
      return records;
    }
    if (!myVetId) return [];
    return records.filter((r) => r.veterinarianId === myVetId);
  }, [records, isAdmin, filterVetId, myVetId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return scoped.filter((r) => {
      if (r.status !== tab) return false;
      const patient = patientsService.getPatientById(r.patientId);
      return (
        !q ||
        patient?.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q)
      );
    });
  }, [scoped, query, tab]);

  const counts = useMemo(() => {
    const base: Record<WorkTab, number> = {
      abierta: 0,
      seguimiento: 0,
      cerrada: 0,
    };
    for (const r of scoped) {
      if (r.status in base) base[r.status as WorkTab] += 1;
    }
    return base;
  }, [scoped]);

  const closeAndClear = () => {
    modal.closeModal();
    setManualEdit(null);
    setManualOpen(false);
    if (searchParams.toString()) {
      router.replace("/consultas");
    }
  };

  const handleCreate = async (data: CreateMedicalRecordInput) => {
    await medicalRecordsService.createMedicalRecord(data);
    await patientsService.updatePatient(data.patientId, { lastVisit: data.date });
    publish();
    void refresh();
  };

  const handleUpdate = async (id: string, data: Partial<MedicalRecord>) => {
    const updated = await medicalRecordsService.updateMedicalRecord(id, data);
    await patientsService.updatePatient(updated.patientId, {
      lastVisit: updated.date,
    });
    publish();
    void refresh();
  };

  const openRecord = (r: MedicalRecord) => {
    setManualEdit(r);
    setManualOpen(true);
    modal.openModal();
  };

  const actionLabel = (status: MedicalRecordStatus) => {
    if (status === "abierta") return "Atender";
    if (status === "seguimiento") return "Continuar";
    return "Revisar";
  };

  if (!isAdmin && !myVetId) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">
          Tu usuario aún no está vinculado a un veterinario
        </p>
        <p className="mt-2 text-sm text-muted">
          Pide al administrador que te registre en Configuración → Equipo como
          veterinario. Así aparecerán aquí tus consultas pendientes y realizadas.
        </p>
        <Link href="/settings" className="mt-4 inline-block">
          <Button size="sm" variant="outline">
            Ir a configuración
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar por mascota, motivo o diagnóstico…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar consultas"
        />
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <Select
              aria-label="Filtrar por veterinario"
              className="min-w-[12rem]"
              value={filterVetId}
              options={[
                { value: "", label: "Todos los veterinarios" },
                ...vets.map((v) => ({ value: v.id, label: v.name })),
              ]}
              onChange={(e) => setFilterVetId(e.target.value)}
            />
          ) : null}
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setManualEdit(null);
              setManualOpen(true);
              modal.openModal();
            }}
          >
            Nueva consulta
          </Button>
        </div>
      </div>

      <div
        className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
        role="tablist"
        aria-label="Estado de consultas"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-primary text-white"
                : "text-muted hover:bg-background hover:text-foreground",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <span
              className={cn(
                "ml-1.5 text-xs",
                tab === item.id ? "text-white/80" : "text-muted",
              )}
            >
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {tab === "abierta"
              ? "No hay consultas pendientes."
              : tab === "seguimiento"
                ? "No hay consultas en seguimiento."
                : "No hay consultas realizadas en esta vista."}
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Fecha</TH>
                    <TH>Mascota</TH>
                    {isAdmin ? <TH>Veterinario</TH> : null}
                    <TH>Motivo</TH>
                    <TH>Diagnóstico</TH>
                    <TH>Estado</TH>
                    <TH>
                      <span className="sr-only">Acciones</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((r) => {
                    const patient = patientsService.getPatientById(r.patientId);
                    const vet = veterinariansService.getVeterinarianById(
                      r.veterinarianId,
                    );
                    const status = medicalRecordStatuses.find(
                      (s) => s.value === r.status,
                    );
                    return (
                      <TR key={r.id}>
                        <TD>{formatDate(r.date)}</TD>
                        <TD className="font-medium">{patient?.name}</TD>
                        {isAdmin ? <TD>{vet?.name}</TD> : null}
                        <TD>{r.reason}</TD>
                        <TD>{r.diagnosis || "—"}</TD>
                        <TD>
                          <StatusBadge
                            label={status?.label ?? r.status}
                            tone={
                              (status?.color as
                                | "success"
                                | "warning"
                                | "primary") ?? "default"
                            }
                          />
                        </TD>
                        <TD>
                          <Button
                            size="sm"
                            variant={r.status === "cerrada" ? "outline" : "primary"}
                            onClick={() => openRecord(r)}
                          >
                            {actionLabel(r.status)}
                          </Button>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {filtered.map((r) => {
                const patient = patientsService.getPatientById(r.patientId);
                const status = medicalRecordStatuses.find(
                  (s) => s.value === r.status,
                );
                return (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full px-4 py-4 text-left hover:bg-background"
                    onClick={() => openRecord(r)}
                  >
                    <p className="font-medium">{patient?.name}</p>
                    <p className="text-sm text-muted">
                      {formatDate(r.date)} · {r.reason}
                    </p>
                    <div className="mt-2">
                      <StatusBadge
                        label={status?.label ?? r.status}
                        tone={
                          (status?.color as
                            | "success"
                            | "warning"
                            | "primary") ?? "default"
                        }
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <MedicalRecordForm
        key={
          editing?.id ??
          `new-${urlPrefills.patientId ?? ""}-${urlPrefills.reason ?? ""}-${open}`
        }
        open={open}
        onClose={closeAndClear}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
        initial={editing}
        lockedPatientId={urlPrefills.patientId}
        lockedVetId={urlPrefills.vetId ?? myVetId ?? undefined}
        defaultReason={urlPrefills.reason}
      />
    </>
  );
}
