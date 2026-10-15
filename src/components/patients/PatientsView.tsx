"use client";

import { PatientForm } from "@/components/patients/PatientForm";
import { patientHasAlerts } from "@/components/patients/ClinicalAlerts";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import type { Client } from "@/types/client";
import type { Patient, Species } from "@/types/patient";
import type { Vaccination } from "@/types/vaccination";
import { clientMatchesQuery, fold } from "@/utils/client-fields";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { formatPatientAge, speciesLabel, speciesOptions } from "@/utils/patient-fields";
import { ChevronRight, PawPrint, Plus, ShieldAlert, Syringe } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Filter = "todos" | "activos" | "inactivos" | "vacuna" | "alerta" | "fallecidos";

const filters: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "inactivos", label: "Inactivos" },
  { id: "vacuna", label: "Vacuna vencida" },
  { id: "alerta", label: "Con alerta" },
  { id: "fallecidos", label: "Fallecidos" },
];

export function PatientsView() {
  const { version, refresh } = useDemo();
  const router = useRouter();
  const modal = useModal();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [species, setSpecies] = useState<Species | "all">("all");

  const prefillClientId = searchParams.get("client") ?? undefined;
  const urlOpen = Boolean(prefillClientId);
  const formOpen = modal.open || urlOpen;

  const directory = useMemo(() => {
    return patientsService.getPatients().map((patient) => {
      const owner = clientsService.getClientById(patient.clientId);
      const vaccine = nextVaccine(patient.id);
      return { patient, owner, vaccine, alert: hasAlert(patient) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const overdue = directory.filter((row) => row.vaccine?.status === "vencida").length;
  const alerts = directory.filter((row) => row.alert).length;

  const visible = useMemo(() => {
    const q = query.trim();
    return directory.filter((row) => {
      const matchesQuery = q.length < 2 || matchesPatient(row.patient, row.owner, q);
      const matchesSpecies = species === "all" || row.patient.species === species;
      const inactive = row.patient.status === "inactivo";
      const deceased = row.patient.vitalStatus === "fallecido";
      const matchesFilter =
        filter === "todos" ||
        (filter === "activos" && !inactive && !deceased) ||
        (filter === "inactivos" && inactive) ||
        (filter === "vacuna" && row.vaccine?.status === "vencida") ||
        (filter === "alerta" && row.alert) ||
        (filter === "fallecidos" && deceased);
      return matchesQuery && matchesSpecies && matchesFilter;
    });
  }, [directory, query, species, filter]);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Pacientes"
          value={directory.length}
          icon={<PawPrint className="h-5 w-5" />}
          hint="En el padrón"
        />
        <StatCard
          label="Vacuna vencida"
          value={overdue}
          icon={<Syringe className="h-5 w-5" />}
          hint={overdue === 0 ? "Ninguna vencida" : "Hay que avisar al tutor"}
        />
        <StatCard
          label="Con alerta"
          value={alerts}
          icon={<ShieldAlert className="h-5 w-5" />}
          hint={alerts === 0 ? "Sin alertas clínicas" : "La consulta debe verlas"}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            className="max-w-none lg:max-w-md"
            placeholder="Nombre, tutor, raza o código"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar pacientes por nombre, tutor, raza o código"
          />
          <select
            value={species}
            onChange={(event) => setSpecies(event.target.value as Species | "all")}
            aria-label="Filtrar por especie"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todas las especies</option>
            {speciesOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nuevo paciente
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
            title={emptyTitle(directory.length, query, filter, species)}
            description={emptyDescription(directory.length, query, filter, species)}
            actionLabel={directory.length === 0 ? "Nuevo paciente" : undefined}
            onAction={directory.length === 0 ? modal.openModal : undefined}
            icon={<PawPrint className="h-5 w-5" />}
          />
        ) : (
          <>
            <div className="hidden border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_8.5rem_1.25rem] md:gap-4">
              <span>Paciente</span>
              <span>Tutor</span>
              <span>Seguimiento</span>
              <span>Última visita</span>
              <span className="sr-only">Abrir</span>
            </div>
            <ul className="divide-y divide-border">
              {visible.map((row) => (
                <li key={row.patient.id}>
                  <PatientRow patient={row.patient} owner={row.owner} vaccine={row.vaccine} alert={row.alert} />
                </li>
              ))}
            </ul>
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
        onCreated={async () => {
          modal.closeModal();
          if (urlOpen) router.replace("/patients");
          await refresh();
        }}
        defaultClientId={prefillClientId}
      />
    </>
  );
}

function PatientRow({
  patient,
  owner,
  vaccine,
  alert,
}: {
  patient: Patient;
  owner?: Client;
  vaccine?: Vaccination;
  alert: boolean;
}) {
  const deceased = patient.vitalStatus === "fallecido";
  const inactive = patient.status === "inactivo";
  const breed = patient.breed.trim() || "Sin raza";
  const sex = patient.sex === "hembra" ? "Hembra" : "Macho";
  const meta = [speciesLabel(patient.species), breed, sex, formatPatientAge(patient)].join(" · ");

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-background/80 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_8.5rem_1.25rem] md:items-center md:gap-4 md:px-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <PetMark name={patient.name} photoUrl={patient.photoUrl} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground group-hover:text-primary">
              {patient.name}
            </span>
            {patient.code ? <span className="text-xs text-muted">{patient.code}</span> : null}
            {deceased ? <Badge variant="danger">Fallecido</Badge> : null}
            {inactive ? <Badge variant="muted">Inactivo</Badge> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{meta}</span>
        </span>
      </span>

      <span className="min-w-0 pl-13 md:pl-0">
        <span className="block truncate text-sm text-foreground">{owner?.name ?? "Sin tutor"}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {owner?.phone.trim() ? formatPhone(owner.phone) : "Sin teléfono"}
        </span>
      </span>

      <span className="min-w-0 pl-13 md:pl-0">
        {vaccine ? (
          <span
            className={cn(
              "block truncate text-sm",
              vaccine.status === "vencida" ? "font-medium text-danger" : "text-warning",
            )}
          >
            {vaccine.name} · {formatDate(vaccine.nextDue)}
          </span>
        ) : alert ? (
          <span className="block text-sm font-medium text-warning">Alerta clínica</span>
        ) : (
          <span className="block text-sm text-muted">Al día</span>
        )}
        {vaccine && alert ? <span className="mt-0.5 block text-xs text-warning">Alerta clínica</span> : null}
      </span>

      <span className="pl-13 text-sm text-foreground md:pl-0">
        {patient.lastVisit ? formatDate(patient.lastVisit) : "Sin visitas"}
      </span>

      <ChevronRight className="hidden h-4 w-4 text-muted group-hover:text-primary md:block" />
    </Link>
  );
}

function PetMark({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
    );
  }
  return <Avatar initials={petInitials(name)} />;
}

function nextVaccine(patientId: string) {
  return vaccinationsService
    .getByPatientId(patientId)
    .filter((item) => item.status === "proxima" || item.status === "vencida")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "vencida" ? -1 : 1;
      return left.nextDue.localeCompare(right.nextDue);
    })[0];
}

function hasAlert(patient: Patient) {
  return patientHasAlerts(patient) || patient.allergies.length > 0;
}

function matchesPatient(patient: Patient, owner: Client | undefined, query: string) {
  const haystack = [
    patient.name,
    patient.altName ?? "",
    patient.breed,
    patient.code ?? "",
    patient.microchip ?? "",
    speciesLabel(patient.species),
  ]
    .map(fold)
    .join(" ");
  if (haystack.includes(fold(query))) return true;
  return owner ? clientMatchesQuery(owner, query) : false;
}

function emptyTitle(total: number, query: string, filter: Filter, species: Species | "all") {
  if (total === 0) return "Aún no hay pacientes";
  if (query.trim().length >= 2) return "Nadie coincide con la búsqueda";
  if (species !== "all") return "No hay pacientes de esta especie";
  if (filter === "vacuna") return "Ninguna vacuna vencida";
  if (filter === "alerta") return "Ninguna alerta clínica";
  if (filter === "fallecidos") return "No hay pacientes fallecidos";
  if (filter === "inactivos") return "No hay fichas inactivas";
  return "No hay pacientes en este filtro";
}

function emptyDescription(total: number, query: string, filter: Filter, species: Species | "all") {
  if (total === 0) return "Registra la primera mascota desde su ficha completa.";
  if (query.trim().length >= 2) return "Prueba con el nombre, el tutor, la raza o el código.";
  if (filter === "vacuna") return "Todas las vacunas registradas están al día.";
  if (filter === "alerta") return "Ninguna ficha tiene alergia, manejo o condición.";
  if (filter === "fallecidos") return "Todas las mascotas figuran con vida.";
  if (filter === "inactivos") return "Todas las fichas están activas.";
  if (species !== "all") return "Prueba con otra especie o con todas.";
  return "Prueba con otro filtro.";
}

function petInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase();
}
