"use client";

import { ClientForm } from "@/components/clients/ClientForm";
import { PatientForm } from "@/components/patients/PatientForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import type { Client } from "@/types/client";
import type { Patient } from "@/types/patient";
import { clientMatchesQuery, relationshipOptions } from "@/utils/client-fields";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { ChevronRight, PawPrint, Phone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Filter = "todos" | "activos" | "inactivos" | "sin-telefono";

const filters: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "inactivos", label: "Inactivos" },
  { id: "sin-telefono", label: "Sin teléfono" },
];

export function ClientsView() {
  const { version, refresh } = useDemo();
  const { toast } = useToast();
  const modal = useModal();
  const [petClientId, setPetClientId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const directory = useMemo(() => {
    return clientsService.getClients().map((client) => {
      const pets = patientsService.getPatientsByClientId(client.id);
      return { client, pets };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const petCount = directory.reduce((total, row) => total + row.pets.length, 0);
  const withoutPhone = directory.filter((row) => !row.client.phone.trim()).length;

  const visible = useMemo(() => {
    const q = query.trim();
    return directory.filter((row) => {
      const matchesQuery = q.length < 2 || clientMatchesQuery(row.client, q);
      const inactive = row.client.status === "inactivo";
      const matchesFilter =
        filter === "todos" ||
        (filter === "activos" && !inactive) ||
        (filter === "inactivos" && inactive) ||
        (filter === "sin-telefono" && !row.client.phone.trim());
      return matchesQuery && matchesFilter;
    });
  }, [directory, query, filter]);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Personas" value={directory.length} icon={<Users className="h-5 w-5" />} hint="En el padrón" />
        <StatCard label="Mascotas" value={petCount} icon={<PawPrint className="h-5 w-5" />} hint="Vinculadas a un tutor" />
        <StatCard
          label="Sin teléfono"
          value={withoutPhone}
          icon={<Phone className="h-5 w-5" />}
          hint={withoutPhone === 0 ? "Todos se pueden avisar" : "No se les puede llamar"}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          className="max-w-none lg:max-w-md"
          placeholder="Nombre, teléfono o documento"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar clientes por nombre, teléfono o documento"
        />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nuevo cliente
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.id
                ? "bg-primary text-white"
                : "bg-surface text-muted ring-1 ring-border hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {visible.length === 0 ? (
          <EmptyState
            title={
              directory.length === 0
                ? "Aún no hay clientes"
                : query.trim().length >= 2
                  ? "Nadie coincide con la búsqueda"
                  : "No hay personas en este filtro"
            }
            description={
              directory.length === 0
                ? "Registra a la primera persona. Con el nombre basta."
                : query.trim().length >= 2
                  ? "Prueba con otro nombre, teléfono o documento."
                  : filter === "inactivos"
                    ? "Todas las fichas están activas."
                    : filter === "sin-telefono"
                      ? "Todas tienen un teléfono registrado."
                      : "Prueba con otro filtro."
            }
            actionLabel={directory.length === 0 ? "Nuevo cliente" : undefined}
            onAction={directory.length === 0 ? modal.openModal : undefined}
            icon={<Users className="h-5 w-5" />}
          />
        ) : (
          <>
            <div className="hidden border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.15fr)_8.5rem_1.25rem] md:gap-4">
              <span>Persona</span>
              <span>Contacto</span>
              <span>Mascotas</span>
              <span>Última visita</span>
              <span className="sr-only">Abrir</span>
            </div>
            <ul className="divide-y divide-border">
              {visible.map((row) => (
                <li key={row.client.id}>
                  <ClientRow client={row.client} pets={row.pets} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ClientForm
        open={modal.open}
        onClose={modal.closeModal}
        onCreated={async (created) => {
          modal.closeModal();
          if (created.warnings?.length) {
            toast(created.warnings[0] ?? "El cliente quedó registrado.");
          } else {
            toast("✓ Cliente creado correctamente");
          }
          await refresh();
          if (created.openPet) setPetClientId(created.id);
        }}
      />
      <PatientForm
        key={petClientId ?? "mascota"}
        open={petClientId != null}
        defaultClientId={petClientId ?? undefined}
        onClose={() => setPetClientId(null)}
        onCreated={async () => {
          setPetClientId(null);
          await refresh();
        }}
      />
    </>
  );
}

function ClientRow({ client, pets }: { client: Client; pets: Patient[] }) {
  const inactive = client.status === "inactivo";
  const relationship =
    relationshipOptions.find((item) => item.value === client.relationship)?.label ?? "Propietario";
  const document =
    client.documentType && client.documentNumber
      ? `${documentLabel(client.documentType)} ${client.documentNumber}`
      : "";
  const place = [client.district, client.department].filter(Boolean).join(", ");
  const meta =
    [
      document,
      client.ruc ? `RUC ${client.ruc}` : "",
      client.relationship && client.relationship !== "propietario" ? relationship : "",
      place,
    ]
      .filter(Boolean)
      .join(" · ") || relationship;
  const shownPets = pets.slice(0, 3);
  const extraPets = pets.length - shownPets.length;

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-background/80 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.15fr)_8.5rem_1.25rem] md:items-center md:gap-4 md:px-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <Avatar initials={initials(client.name)} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground group-hover:text-primary">
              {client.name}
            </span>
            {inactive ? <Badge variant="muted">Inactivo</Badge> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{meta}</span>
        </span>
      </span>

      <span className="min-w-0 pl-13 md:pl-0">
        <span className="block text-sm text-foreground">
          {client.phone.trim() ? formatPhone(client.phone) : "Sin teléfono"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {client.email.trim() || "Sin correo"}
        </span>
      </span>

      <span className="flex flex-wrap gap-1.5 pl-13 md:pl-0">
        {shownPets.length === 0 ? (
          <span className="text-sm text-muted">Sin mascotas</span>
        ) : (
          shownPets.map((pet) => (
            <span
              key={pet.id}
              className="inline-flex max-w-full items-center rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary"
            >
              <span className="truncate">{pet.name}</span>
            </span>
          ))
        )}
        {extraPets > 0 ? (
          <span className="inline-flex items-center rounded-full bg-background px-2 py-1 text-xs text-muted">
            +{extraPets}
          </span>
        ) : null}
      </span>

      <span className="pl-13 text-sm text-foreground md:pl-0">
        {client.lastVisit ? formatDate(client.lastVisit) : "Sin visitas"}
      </span>

      <ChevronRight className="hidden h-4 w-4 text-muted group-hover:text-primary md:block" />
    </Link>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function documentLabel(type: NonNullable<Client["documentType"]>) {
  if (type === "PASAPORTE") return "Pasaporte";
  if (type === "OTRO") return "Documento";
  if (type === "CE") return "CE";
  return "DNI";
}
