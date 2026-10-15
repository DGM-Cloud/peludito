"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatCard";
import { medicalRecordStatuses } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { medicalRecordsService } from "@/services/medical-records.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { MedicalRecord } from "@/types/medical-record";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { ArrowRight, FileText, Syringe } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function MedicalRecordsView() {
  const { version, role, veterinarianId } = useDemo();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const patientFilter = searchParams.get("patient");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);

  const records = useMemo(
    () => medicalRecordsService.getMedicalRecords(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return records.filter((r) => {
      if (patientFilter && r.patientId !== patientFilter) return false;
      const patient = patientsService.getPatientById(r.patientId);
      return (
        !q ||
        patient?.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q) ||
        r.treatment.toLowerCase().includes(q)
      );
    });
  }, [records, query, patientFilter]);

  const selected =
    (selectedId
      ? medicalRecordsService.getMedicalRecordById(selectedId)
      : null) ??
    (highlightId
      ? medicalRecordsService.getMedicalRecordById(highlightId)
      : null) ??
    filtered[0] ??
    null;

  const canContinue =
    selected &&
    (selected.status === "abierta" || selected.status === "seguimiento") &&
    (role === "administrador" ||
      (veterinarianId != null && selected.veterinarianId === veterinarianId));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <SearchInput
          placeholder="Buscar por mascota, motivo, diagnóstico o tratamiento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar en historias clínicas"
        />
        {patientFilter ? (
          <p className="text-xs text-muted">
            Filtrado por paciente.{" "}
            <Link href="/medical-records" className="text-primary hover:underline">
              Ver todas
            </Link>
          </p>
        ) : null}

        <Card padding={false}>
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No hay historias que coincidan con la búsqueda.
            </p>
          ) : (
            <ul className="divide-y divide-border" role="listbox" aria-label="Historias">
              {filtered.map((r) => {
                const patient = patientsService.getPatientById(r.patientId);
                const vet = veterinariansService.getVeterinarianById(r.veterinarianId);
                const status = medicalRecordStatuses.find((s) => s.value === r.status);
                const active = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "w-full px-4 py-3.5 text-left transition-colors",
                        active ? "bg-primary-light" : "hover:bg-background",
                      )}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {patient?.name ?? "Paciente"}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-muted">
                            {formatDate(r.date)} · {r.reason}
                          </p>
                          {vet?.name ? (
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {vet.name}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge
                          label={status?.label ?? r.status}
                          tone={
                            (status?.color as "success" | "warning" | "primary") ??
                            "default"
                          }
                        />
                      </div>
                      {r.diagnosis ? (
                        <p className="mt-2 line-clamp-2 text-xs text-foreground/80">
                          {r.diagnosis}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <aside>
        {selected ? (
          <RecordDetail
            record={selected}
            canContinue={Boolean(canContinue)}
          />
        ) : (
          <Card className="flex min-h-[16rem] flex-col items-center justify-center text-center">
            <FileText className="h-8 w-8 text-muted" />
            <p className="mt-3 text-sm text-muted">
              Selecciona una historia para ver el detalle clínico.
            </p>
          </Card>
        )}
      </aside>
    </div>
  );
}

function RecordDetail({
  record,
  canContinue,
}: {
  record: MedicalRecord;
  canContinue: boolean;
}) {
  const patient = patientsService.getPatientById(record.patientId);
  const vet = veterinariansService.getVeterinarianById(record.veterinarianId);
  const status = medicalRecordStatuses.find((s) => s.value === record.status);
  const linkedVaccines = vaccinationsService.getByMedicalRecordId(record.id);

  return (
    <Card className="sticky top-4">
      <CardHeader
        title={patient?.name ?? "Paciente"}
        description={`${formatDate(record.date)} · ${record.reason}`}
        action={
          <StatusBadge
            label={status?.label ?? record.status}
            tone={
              (status?.color as "success" | "warning" | "primary") ?? "default"
            }
          />
        }
      />

      <dl className="space-y-4 text-sm">
        <DetailRow label="Médico tratante" value={vet?.name ?? "—"} />
        <DetailRow label="Motivo" value={record.reason} />
        <DetailRow label="Síntomas" value={record.symptoms || "—"} />
        <DetailRow label="Diagnóstico" value={record.diagnosis || "Sin diagnóstico"} />
        <DetailRow label="Tratamiento" value={record.treatment || "—"} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            Medicación
          </dt>
          <dd className="mt-1 text-foreground">
            {record.medications.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5">
                {record.medications.map((med) => (
                  <li key={med}>{med}</li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {record.observations ? (
          <DetailRow label="Observaciones" value={record.observations} />
        ) : null}
        {linkedVaccines.length > 0 ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Vacunas aplicadas en esta atención
            </dt>
            <dd className="mt-1 space-y-1.5 text-foreground">
              {linkedVaccines.map((vac) => (
                <p key={vac.id} className="flex items-start gap-2 text-sm">
                  <Syringe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    {vac.name} · lote {vac.lot}
                    {vac.route ? ` · ${vac.route}` : ""}
                  </span>
                </p>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        {canContinue ? (
          <Link href={`/consultas?record=${record.id}`}>
            <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continuar en Mis consultas
            </Button>
          </Link>
        ) : null}
        <Link
          href={`/vaccines?patient=${record.patientId}&record=${record.id}`}
        >
          <Button size="sm" variant="outline" leftIcon={<Syringe className="h-4 w-4" />}>
            Registrar vacuna
          </Button>
        </Link>
        <Link href={`/patients/${record.patientId}`}>
          <Button size="sm" variant="outline">
            Ver ficha del paciente
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-foreground">{value}</dd>
    </div>
  );
}
