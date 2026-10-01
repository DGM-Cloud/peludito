"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatCard";
import { WhatsAppAction } from "@/components/ui/WhatsAppAction";
import { useToast } from "@/components/ui/Toast";
import { followUpStatuses, followUpTypes } from "@/data/constants/statuses";
import { useDemo } from "@/context/DemoProvider";
import { clientsService } from "@/services/clients.service";
import { followUpsService } from "@/services/follow-ups.service";
import { patientsService } from "@/services/patients.service";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";
import { useMemo } from "react";

export function FollowUpsView() {
  const { version, refresh } = useDemo();
  const { toast } = useToast();

  const items = useMemo(
    () => followUpsService.getFollowUps(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return (
    <Card padding={false}>
      <ul className="divide-y divide-border">
        {items.map((fu) => {
          const patient = patientsService.getPatientById(fu.patientId);
          const client = clientsService.getClientById(fu.clientId);
          const typeLabel =
            followUpTypes.find((t) => t.value === fu.type)?.label ?? fu.type;
          const status = followUpStatuses.find((s) => s.value === fu.status);
          return (
            <li
              key={fu.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{fu.title}</p>
                <p className="text-sm text-muted">
                  <Link
                    href={`/patients/${fu.patientId}`}
                    className="text-primary hover:underline"
                  >
                    {patient?.name}
                  </Link>{" "}
                  · {client?.name} · Vence {formatDate(fu.dueDate)}
                </p>
                <p className="mt-1 text-xs text-muted">{typeLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={status?.label ?? fu.status}
                  tone={
                    (status?.color as
                      | "success"
                      | "warning"
                      | "primary"
                      | "muted") ?? "default"
                  }
                />
                {fu.status === "pendiente" ? (
                  <>
                    <WhatsAppAction label="Contactar por WhatsApp" />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        followUpsService.updateFollowUp(fu.id, {
                          status: "contactado",
                        });
                        toast("✓ Marcado como contactado");
                        refresh();
                      }}
                    >
                      Contactado
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        followUpsService.updateFollowUp(fu.id, {
                          status: "completado",
                        });
                        toast("✓ Seguimiento completado");
                        refresh();
                      }}
                    >
                      Completar
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
