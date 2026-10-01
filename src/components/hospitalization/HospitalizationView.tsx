"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatCard";
import { hospitalizationStatuses } from "@/data/constants/statuses";
import { DEMO_TODAY } from "@/config/demo";
import { useDemo } from "@/context/DemoProvider";
import { useToast } from "@/components/ui/Toast";
import { hospitalizationsService } from "@/services/hospitalizations.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { formatDate } from "@/utils/formatDate";
import { useMemo, useState } from "react";
import Link from "next/link";

export function HospitalizationView() {
  const { version, refresh } = useDemo();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const items = useMemo(
    () => hospitalizationsService.getActive(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const selected =
    items.find((h) => h.id === selectedId) ?? items[0] ?? null;

  const addNote = () => {
    if (!selected || !note.trim()) return;
    hospitalizationsService.addNote(selected.id, {
      date: DEMO_TODAY,
      time: new Date().toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      note,
      veterinarianId: selected.veterinarianId,
    });
    setNote("");
    toast("✓ Evolución registrada");
    refresh();
  };

  const discharge = () => {
    if (!selected) return;
    const patient = patientsService.getPatientById(selected.patientId);
    if (
      !window.confirm(
        `¿Dar de alta a ${patient?.name ?? "este paciente"}?\nSe cerrará la hospitalización en ${selected.cage}.`,
      )
    ) {
      return;
    }
    hospitalizationsService.updateStatus(selected.id, "alta");
    toast("✓ Alta registrada — paciente listo para retiro");
    setSelectedId(null);
    refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1" padding={false}>
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Hospitalizados</p>
        </div>
        <ul className="divide-y divide-border">
          {items.map((h) => {
            const patient = patientsService.getPatientById(h.patientId);
            const status = hospitalizationStatuses.find((s) => s.value === h.status);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(h.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-background ${
                    selected?.id === h.id ? "bg-primary-light/40" : ""
                  }`}
                >
                  <p className="font-medium">{patient?.name}</p>
                  <p className="text-xs text-muted">
                    {h.cage} · Ingreso {formatDate(h.admissionDate)}
                  </p>
                  <div className="mt-1">
                    <StatusBadge
                      label={status?.label ?? h.status}
                      tone={(status?.color as "success" | "warning" | "danger" | "primary" | "muted") ?? "default"}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {selected ? (
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title={patientsService.getPatientById(selected.patientId)?.name ?? ""}
              description={`${selected.cage} · ${selected.reason}`}
              action={
                <Link
                  href={`/patients/${selected.patientId}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver paciente
                </Link>
              }
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Veterinario</dt>
                <dd>
                  {
                    veterinariansService.getVeterinarianById(
                      selected.veterinarianId,
                    )?.name
                  }
                </dd>
              </div>
              <div>
                <dt className="text-muted">Tratamiento</dt>
                <dd>{selected.treatment}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Observaciones</dt>
                <dd>{selected.observations ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={discharge}>
                Dar de alta
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Evolución" />
            <ol className="mb-4 space-y-3 border-l border-border pl-4">
              {selected.notes.map((n) => (
                <li key={n.id}>
                  <p className="text-xs text-muted">
                    {formatDate(n.date)} · {n.time}
                  </p>
                  <p className="text-sm">{n.note}</p>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <Input
                placeholder="Nueva nota de evolución…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button onClick={addNote}>Agregar</Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="lg:col-span-2">
          <p className="text-sm text-muted">No hay pacientes hospitalizados.</p>
        </Card>
      )}
    </div>
  );
}
