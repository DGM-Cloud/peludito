"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDemo } from "@/context/DemoProvider";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import type { Patient } from "@/types/patient";
import { clientMatchesQuery } from "@/utils/client-fields";
import { todayISODate } from "@/utils/formatDate";
import { useState } from "react";

export function PatientFileActions({ patient }: { patient: Patient }) {
  const { publish } = useDemo();
  const [mode, setMode] = useState<"tutor" | "deceased" | "status" | null>(null);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState(patient.clientId);
  const [deceasedOn, setDeceasedOn] = useState(patient.deceasedOn || todayISODate());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const matches = query.trim()
    ? clientsService.getClients().filter((client) => clientMatchesQuery(client, query)).slice(0, 6)
    : [];

  function open(next: "tutor" | "deceased" | "status") {
    setMode(next);
    setError("");
    setQuery("");
    setClientId(patient.clientId);
    setDeceasedOn(patient.deceasedOn || todayISODate());
  }

  async function save(changes: Partial<Patient>) {
    setSaving(true);
    setError("");
    try {
      await patientsService.updatePatient(patient.id, changes);
      publish();
      setMode(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => open("tutor")}>
        Cambiar tutor
      </Button>
      <Button size="sm" variant="outline" onClick={() => open("deceased")}>
        {patient.vitalStatus === "fallecido" ? "Estado vital" : "Marcar fallecido"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => open("status")}>
        {patient.status === "activo" ? "Dar de baja" : "Reactivar ficha"}
      </Button>

      <Modal
        open={mode != null}
        onClose={() => setMode(null)}
        title={
          mode === "tutor" ? "Cambiar tutor" : mode === "deceased" ? "Estado vital" : "Estado de la ficha"
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {mode === "tutor" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              El historial de consultas, vacunas y documentos se queda con la mascota.
            </p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tutor por nombre, documento o teléfono"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
            <ul className="space-y-1">
              {matches.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
                    onClick={() => setClientId(client.id)}
                  >
                    <span className={client.id === clientId ? "font-semibold text-primary" : ""}>
                      {client.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button
              disabled={saving || clientId === patient.clientId}
              onClick={() => save({ clientId })}
            >
              Guardar tutor
            </Button>
          </div>
        ) : null}

        {mode === "deceased" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Fallecido no borra consultas ni documentos. Es distinto de dar de baja la ficha.
            </p>
            <label className="block text-sm">
              Fecha de fallecimiento
              <input
                type="date"
                value={deceasedOn.slice(0, 10)}
                max={todayISODate()}
                onChange={(event) => setDeceasedOn(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border px-3"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={saving} onClick={() => save({ vitalStatus: "fallecido", deceasedOn })}>
                Registrar fallecimiento
              </Button>
              {patient.vitalStatus === "fallecido" ? (
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => save({ vitalStatus: "vivo", deceasedOn: "" })}
                >
                  Sigue con vida
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {mode === "status" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Dar de baja oculta la ficha del trabajo diario y conserva el historial.
            </p>
            <Button
              disabled={saving}
              onClick={() => save({ status: patient.status === "activo" ? "inactivo" : "activo" })}
            >
              {patient.status === "activo" ? "Dar de baja" : "Reactivar"}
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
