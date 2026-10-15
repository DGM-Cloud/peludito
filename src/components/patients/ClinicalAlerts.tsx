import type { Patient } from "@/types/patient";
import { handlingOptions } from "@/utils/patient-fields";

export function patientHasAlerts(patient: Patient) {
  return Boolean(
    (patient.confirmedAllergies ?? []).length ||
      (patient.adverseReactions ?? []).length ||
      (patient.chronicConditions ?? []).length ||
      (patient.handlingAlerts ?? []).length ||
      patient.safetyNotes,
  );
}

export function ClinicalAlerts({ patient, compact = false }: { patient: Patient; compact?: boolean }) {
  const confirmed = (patient.confirmedAllergies ?? []).filter((item) => item.status === "confirmada");
  const suspected = (patient.confirmedAllergies ?? []).filter((item) => item.status === "sospechada");
  const legacy =
    confirmed.length === 0 && suspected.length === 0 ? patient.allergies : [];
  const handling = (patient.handlingAlerts ?? [])
    .map((item) => handlingOptions.find((option) => option.value === item)?.label ?? item)
    .join(", ");

  if (!patientHasAlerts(patient) && legacy.length === 0) {
    return <p className="text-sm text-muted">Sin alertas registradas.</p>;
  }

  return (
    <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
      {confirmed.length || legacy.length ? (
        <Alert
          tone="danger"
          label="Alergias confirmadas"
          value={[...confirmed.map(describeAllergy), ...legacy].join(" · ")}
        />
      ) : null}
      {suspected.length ? (
        <Alert
          tone="warning"
          label="Sospechas, no confirmadas"
          value={suspected.map(describeAllergy).join(" · ")}
        />
      ) : null}
      {(patient.adverseReactions ?? []).length ? (
        <Alert
          tone="warning"
          label="Reacciones previas"
          value={(patient.adverseReactions ?? [])
            .map((item) => [item.product, item.reaction].filter(Boolean).join(": "))
            .join(" · ")}
        />
      ) : null}
      {(patient.chronicConditions ?? []).length ? (
        <Alert
          tone="neutral"
          label="Condiciones"
          value={(patient.chronicConditions ?? [])
            .map((item) => [item.name, item.notes].filter(Boolean).join(" — "))
            .join(" · ")}
        />
      ) : null}
      {handling ? <Alert tone="warning" label="Manejo" value={handling} /> : null}
      {patient.safetyNotes ? (
        <Alert tone="danger" label="Nota para el personal" value={patient.safetyNotes} />
      ) : null}
    </div>
  );
}

function describeAllergy(item: { substance: string; reaction: string; severity?: string }) {
  return [item.substance, item.reaction, item.severity].filter(Boolean).join(", ");
}

function Alert({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger/30 bg-danger-light/50 text-danger"
      : tone === "warning"
        ? "border-warning/30 bg-warning-light/60 text-warning"
        : "border-border bg-background text-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
