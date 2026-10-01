"use client";

import { PatientForm } from "@/components/patients/PatientForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { speciesOptions } from "@/data/constants/categories";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import type { Species } from "@/types/patient";
import { calculateAge } from "@/utils/calculateAge";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { PawPrint, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function PatientsView() {
  const { version, refresh } = useDemo();
  const router = useRouter();
  const modal = useModal();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<Species | "all">("all");

  const prefillClientId = searchParams.get("client") ?? undefined;
  const urlOpen = Boolean(prefillClientId);
  const formOpen = modal.open || urlOpen;

  const patients = useMemo(
    () => patientsService.getPatients(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const owner = clientsService.getClientById(p.clientId);
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.breed.toLowerCase().includes(query.toLowerCase()) ||
        owner?.name.toLowerCase().includes(query.toLowerCase());
      const matchesSpecies = species === "all" || p.species === species;
      return matchesQuery && matchesSpecies;
    });
  }, [patients, query, species]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar mascota, raza o propietario…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar pacientes"
        />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nuevo paciente
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          active={species === "all"}
          onClick={() => setSpecies("all")}
          label="Todos"
        />
        {speciesOptions.map((opt) => (
          <FilterChip
            key={opt.value}
            active={species === opt.value}
            onClick={() => setSpecies(opt.value)}
            label={opt.label}
          />
        ))}
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No se encontraron pacientes"
            description="Prueba con otro filtro o agrega un nuevo paciente."
            actionLabel="Nuevo paciente"
            onAction={modal.openModal}
            icon={<PawPrint className="h-5 w-5" />}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Paciente</TH>
                    <TH>Propietario</TH>
                    <TH>Última atención</TH>
                    <TH>Próxima vacuna</TH>
                    <TH>Estado</TH>
                    <TH>Acción</TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((p) => {
                    const owner = clientsService.getClientById(p.clientId);
                    const nextVac = vaccinationsService
                      .getByPatientId(p.id)
                      .filter((v) => v.status === "proxima" || v.status === "vencida")
                      .sort((a, b) => a.nextDue.localeCompare(b.nextDue))[0];
                    return (
                      <TR key={p.id}>
                        <TD>
                          <Link
                            href={`/patients/${p.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted">
                            {p.breed} · {calculateAge(p.birthDate)}
                          </p>
                        </TD>
                        <TD>
                          {owner ? (
                            <Link
                              href={`/clients/${owner.id}`}
                              className="hover:underline"
                            >
                              {owner.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD>{p.lastVisit ? formatDate(p.lastVisit) : "—"}</TD>
                        <TD>
                          {nextVac ? (
                            <span
                              className={
                                nextVac.status === "vencida"
                                  ? "text-danger"
                                  : "text-warning"
                              }
                            >
                              {nextVac.name} · {formatDate(nextVac.nextDue)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD>
                          <StatusBadge
                            label={p.status === "activo" ? "Activo" : "Inactivo"}
                            tone={p.status === "activo" ? "success" : "muted"}
                          />
                        </TD>
                        <TD>
                          <Link href={`/patients/${p.id}`}>
                            <Button size="sm" variant="outline">
                              Abrir
                            </Button>
                          </Link>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {filtered.map((p) => {
                const owner = clientsService.getClientById(p.clientId);
                return (
                  <Link
                    key={p.id}
                    href={`/patients/${p.id}`}
                    className="block px-4 py-4 hover:bg-background"
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.breed} · {owner?.name}
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <PatientForm
        key={`patient-${prefillClientId ?? ""}-${formOpen}`}
        open={formOpen}
        onClose={() => {
          modal.closeModal();
          if (urlOpen) router.replace("/patients");
        }}
        onSubmit={(data) => {
          patientsService.createPatient(data);
          refresh();
        }}
        defaultClientId={prefillClientId}
      />
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-surface text-muted ring-1 ring-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
