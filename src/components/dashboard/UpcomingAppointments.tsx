import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatCard";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import type { Appointment } from "@/types/appointment";
import { appointmentStatuses } from "@/data/constants/statuses";

function toneFor(status: Appointment["status"]) {
  const found = appointmentStatuses.find((s) => s.value === status);
  return (found?.color ?? "default") as
    | "success"
    | "warning"
    | "primary"
    | "danger"
    | "default";
}

export function UpcomingAppointments({ items }: { items: Appointment[] }) {
  return (
    <Card>
      <CardHeader
        title="Próximas citas"
        description="Agenda del día y siguientes"
      />
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No hay citas próximas.</p>
        ) : (
          items.map((apt) => {
            const patient = patientsService.getPatientById(apt.patientId);
            const client = clientsService.getClientById(apt.clientId);
            const vet = veterinariansService.getVeterinarianById(
              apt.veterinarianId,
            );
            const statusLabel =
              appointmentStatuses.find((s) => s.value === apt.status)?.label ??
              apt.status;

            return (
              <div
                key={apt.id}
                className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="w-12 shrink-0 text-sm font-semibold text-primary">
                    {apt.time}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {patient?.name ?? "Paciente"}
                    </p>
                    <p className="text-xs text-muted">
                      {client?.name} · {apt.reason} · {vet?.name}
                    </p>
                  </div>
                </div>
                <StatusBadge label={statusLabel} tone={toneFor(apt.status)} />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
