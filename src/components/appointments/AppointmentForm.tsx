"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { catalogService } from "@/services/catalog.service";
import { serviceTypeOptions, sexOptions, speciesOptions } from "@/data/constants/categories";
import { useDemo } from "@/context/DemoProvider";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { appointmentsService } from "@/services/appointments.service";
import type {
  Appointment,
  AppointmentChannel,
  AppointmentServiceType,
  CreateAppointmentInput,
} from "@/types/appointment";
import type { Client, DocumentType } from "@/types/client";
import type { Sex, Species } from "@/types/patient";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  formatLongDate,
  isPastAppointment,
  limaClock,
  openingAppointment,
  pastAppointmentMessage,
} from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { speciesLabel } from "@/utils/patient-fields";
import { appointmentGroupShareText, whatsappHref } from "@/utils/whatsapp";
import { cn } from "@/utils/cn";
import { toMinutes } from "@/server/domain";
import {
  CalendarClock,
  Check,
  ClipboardList,
  MessageCircle,
  PawPrint,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAppointmentInput) => void | Promise<void | Appointment>;
  defaultDate?: string;
  defaultClientId?: string;
  defaultPatientId?: string;
};

const channelChoices: { value: AppointmentChannel; label: string }[] = [
  { value: "presencial", label: "Presencial" },
  { value: "telefono", label: "Teléfono" },
  { value: "whatsapp", label: "WhatsApp" },
];

export function AppointmentForm({
  open,
  onClose,
  onSubmit,
  defaultDate,
  defaultClientId,
  defaultPatientId,
}: Props) {
  const { toast } = useToast();
  const { clinicId, clinic, refresh, publish, version } = useDemo();
  const vets = veterinariansService.getVeterinarians();
  const services = catalogService.getServices();
  const serviceChoices =
    services.length > 0
      ? services
      : serviceTypeOptions.map((option) => ({
          id: option.value,
          name: option.label,
          category: option.value,
          price: 0,
          durationMinutes: 30,
        }));
  const presetClient = defaultClientId
    ? clientsService.getClientById(defaultClientId)
    : undefined;

  const initialClient = presetClient?.id ?? "";
  const initialPets = patientsService.getPatientsByClientId(initialClient);

  const [clientId, setClientId] = useState(initialClient);
  const [lookupQuery, setLookupQuery] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [missingQuery, setMissingQuery] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerDocumentType, setRegisterDocumentType] =
    useState<DocumentType>("DNI");
  const [registerDocument, setRegisterDocument] = useState("");
  const pets = useMemo(() => {
    void version;
    return clientId ? patientsService.getPatientsByClientId(clientId) : [];
  }, [clientId, version]);
  const [patientIds, setPatientIds] = useState<string[]>(
    defaultPatientId && initialPets.some((pet) => pet.id === defaultPatientId)
      ? [defaultPatientId]
      : initialPets.length === 1
        ? [initialPets[0].id]
        : [],
  );
  const [veterinarianId, setVeterinarianId] = useState(vets[0]?.id ?? "");
  const [serviceType, setServiceType] =
    useState<AppointmentServiceType>("consulta");
  const [catalogId, setCatalogId] = useState("");
  const [channel, setChannel] = useState<AppointmentChannel>("presencial");
  const [remindClient, setRemindClient] = useState(true);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState<Species>("perro");
  const [petBreed, setPetBreed] = useState("");
  const [petSex, setPetSex] = useState<Sex | "">("");
  const [savingPet, setSavingPet] = useState(false);
  const [share, setShare] = useState<{
    clientName: string;
    vetName: string;
    phone: string;
    date: string;
    serviceName: string;
    visits: { petName: string; time: string; token: string }[];
  } | null>(null);
  const [date, setDate] = useState(() => openingAppointment(defaultDate).date);
  const [time, setTime] = useState(() => openingAppointment(defaultDate).time);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  const selectedClient = clientId
    ? clientsService.getClientById(clientId)
    : undefined;
  const lookupResults = useMemo(
    () => (lookupQuery.trim().length < 2 ? [] : clientsService.searchByNameOrDocument(lookupQuery)),
    [lookupQuery],
  );

  const selectedService =
    serviceChoices.find((item) => item.id === catalogId) ?? serviceChoices[0];
  const durationMinutes = selectedService?.durationMinutes || 30;
  const estimatedPrice = selectedService?.price ?? 0;

  useEffect(() => {
    if (open && !wasOpen.current) {
      const first = serviceChoices[0];
      const slot = openingAppointment(defaultDate);
      setDate(slot.date);
      setTime(slot.time);
      setShare(null);
      setError("");
      setChannel("presencial");
      setRemindClient(true);
      setCatalogId(first?.id ?? "");
      setServiceType((first?.category as AppointmentServiceType) || "consulta");
      setReason(first?.name ?? "");
      setLookupQuery("");
      setPromptOpen(false);
      setRegisterOpen(false);
      if (presetClient) {
        setClientId(presetClient.id);
        const nextPets = patientsService.getPatientsByClientId(presetClient.id);
        setPatientIds(
          defaultPatientId && nextPets.some((pet) => pet.id === defaultPatientId)
            ? [defaultPatientId]
            : nextPets.length === 1
              ? [nextPets[0].id]
              : [],
        );
      } else {
        setClientId("");
        setPatientIds([]);
      }
    }
    wasOpen.current = open;
  }, [open, defaultDate, serviceChoices, presetClient, defaultPatientId]);

  const sameTime = selectedService?.category === "grooming";
  const plannedVisits = useMemo(() => {
    const start = toMinutes(time);
    return patientIds.map((id, index) => {
      const pet = pets.find((item) => item.id === id);
      const minute = start + (sameTime ? 0 : index * durationMinutes);
      const fitsClock = minute < 24 * 60;
      const slot = fitsClock ? minutesToClock(minute) : "";
      const fits =
        Boolean(slot) &&
        !appointmentsService.isSlotTaken(
          veterinarianId,
          date,
          slot,
          durationMinutes,
          undefined,
          sameTime ? "grooming" : serviceType,
        );
      return {
        patientId: id,
        name: pet?.name ?? "Mascota",
        time: slot,
        fits,
      };
    });
  }, [
    patientIds,
    pets,
    time,
    durationMinutes,
    sameTime,
    veterinarianId,
    date,
    serviceType,
    version,
  ]);
  const scheduleBlocked = plannedVisits.some((item) => !item.fits);
  const clock = limaClock();
  const timeInPast = isPastAppointment(date, time);

  const applyClient = (client: Client) => {
    setClientId(client.id);
    setLookupQuery("");
    setPromptOpen(false);
    const nextPets = patientsService.getPatientsByClientId(client.id);
    const preferred =
      defaultPatientId && nextPets.some((pet) => pet.id === defaultPatientId)
        ? [defaultPatientId]
        : nextPets.length === 1
          ? [nextPets[0].id]
          : [];
    setPatientIds(preferred);
  };

  const clearClient = () => {
    setClientId("");
    setPatientIds([]);
    setLookupQuery("");
  };

  const askToRegister = (query: string) => {
    setMissingQuery(query.trim());
    setPromptOpen(true);
  };

  const runSearch = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    const query = lookupQuery.trim();
    if (query.length < 2) return;
    if (lookupResults.length === 1) {
      applyClient(lookupResults[0]);
      return;
    }
    const digits = query.replace(/\D/g, "");
    if (digits.length >= 8 && digits === query.replace(/\s/g, "")) {
      const found = await clientsService.findByDocument(digits);
      if (found) {
        applyClient(found);
        return;
      }
    }
    if (lookupResults.length === 0) askToRegister(query);
  };

  const openRegister = () => {
    const digits = missingQuery.replace(/\D/g, "");
    const isDocument = digits.length >= 8 && digits === missingQuery.trim();
    setRegisterName(isDocument ? "" : missingQuery);
    setRegisterPhone("");
    setRegisterEmail("");
    setRegisterDocumentType(digits.length > 8 ? "CE" : "DNI");
    setRegisterDocument(isDocument ? digits : "");
    setPromptOpen(false);
    setRegisterOpen(true);
  };

  const saveClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registerName.trim() || !registerPhone.trim() || !registerDocument.trim()) {
      return;
    }
    const client = await clientsService.createClient({
      name: registerName.trim(),
      phone: registerPhone.trim(),
      email: registerEmail.trim(),
      documentType: registerDocumentType,
      documentNumber: registerDocument.trim(),
    });
    await refresh();
    applyClient(client);
    setRegisterOpen(false);
    toast("✓ Cliente registrado");
  };

  const chooseService = (id: string) => {
    const next = serviceChoices.find((item) => item.id === id);
    const previous = serviceChoices.find((item) => item.id === catalogId);
    setCatalogId(id);
    if (!next) return;
    setServiceType((next.category as AppointmentServiceType) || "consulta");
    setReason((current) => (!current || current === previous?.name ? next.name : current));
  };

  const togglePet = (id: string) => {
    setPatientIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const savePet = async () => {
    if (!clientId || !petName.trim() || !petBreed.trim() || !petSex) return;
    setSavingPet(true);
    try {
      const pet = await patientsService.createPatient({
        clientId,
        name: petName.trim(),
        species: petSpecies,
        breed: petBreed.trim(),
        sex: petSex,
        birthDate: "",
        weight: 0,
        microchip: null,
        allergies: [],
      });
      publish();
      setPatientIds((current) => (current.includes(pet.id) ? current : [...current, pet.id]));
      setPetName("");
      setPetBreed("");
      setPetSex("");
      toast("✓ Mascota registrada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la mascota");
    } finally {
      setSavingPet(false);
    }
  };

  const closeAppointment = () => {
    if (registerOpen) {
      setRegisterOpen(false);
      return;
    }
    if (promptOpen) {
      setPromptOpen(false);
      return;
    }
    setShare(null);
    onClose();
  };

  const shareMessage = share
    ? appointmentGroupShareText({
        clinicName: clinic.name,
        clientName: share.clientName,
        serviceName: share.serviceName,
        dateLabel: formatLongDate(share.date),
        vetName: share.vetName,
        visits: share.visits.map((visit) => ({
          petName: visit.petName,
          time: visit.time,
          link: `${window.location.origin}/cita/${visit.token}`,
        })),
      })
    : "";
  const whatsappLink = share ? whatsappHref(share.phone, shareMessage) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!clientId || patientIds.length === 0 || !reason.trim()) {
      setError("Elige el tutor, al menos una mascota y el motivo.");
      return;
    }
    if (timeInPast) {
      setError(pastAppointmentMessage());
      return;
    }
    if (scheduleBlocked || plannedVisits.length === 0) {
      setError("Hay una mascota que no entra en este horario.");
      return;
    }
    setSaving(true);
    const saved: { petName: string; time: string; token: string }[] = [];
    let failed = "";
    try {
      for (const visit of plannedVisits) {
        try {
          const created = await onSubmit({
            patientId: visit.patientId,
            clientId,
            veterinarianId,
            clinicId,
            date,
            time: visit.time,
            reason: reason.trim() || selectedService?.name || "Consulta",
            serviceType: (selectedService?.category as AppointmentServiceType) || serviceType,
            durationMinutes,
            estimatedPrice,
            channel,
            remindClient,
            notes: notes || undefined,
            status: "programada",
          });
          const token = created && "publicToken" in created ? created.publicToken : undefined;
          if (token) saved.push({ petName: visit.name, time: visit.time, token });
        } catch (err) {
          failed = err instanceof Error ? err.message : "No se pudo crear la cita";
          break;
        }
      }
    } finally {
      setSaving(false);
    }
    if (failed && saved.length === 0) {
      setError(failed);
      return;
    }
    if (failed) {
      setError(`${failed} ${saved.map((item) => item.petName).join(", ")} sí quedaron agendadas.`);
    }
    if (saved.length === 0) {
      toast("✓ Cita creada correctamente");
      onClose();
      return;
    }
    const vet = vets.find((item) => item.id === veterinarianId);
    setShare({
      clientName: selectedClient?.name ?? "",
      vetName: vet?.name ?? "",
      phone: remindClient ? selectedClient?.phone ?? "" : "",
      date,
      serviceName: reason.trim(),
      visits: saved,
    });
    setNotes("");
  };

  return (
    <>
      <Modal
        open={open}
        onClose={closeAppointment}
        title={share ? "Cita lista" : "Nueva cita"}
        size="wide"
        footer={
          share ? (
            <Button onClick={closeAppointment}>Cerrar</Button>
          ) : (
            <>
              <p className={cn("mr-auto text-xs", error ? "text-danger" : "text-muted")}>
                {error ||
                  (patientIds.length > 1
                    ? `${patientIds.length} mascotas en esta reserva.`
                    : "Elige tutor, mascota y horario.")}
              </p>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="appointment-form"
                disabled={scheduleBlocked || timeInPast || saving || patientIds.length === 0}
              >
                {saving
                  ? "Guardando…"
                  : plannedVisits.length > 1
                    ? `Confirmar ${plannedVisits.length} citas`
                    : "Confirmar cita"}
              </Button>
            </>
          )
        }
      >
        {share ? (
          <SharePanel
            share={share}
            shareMessage={shareMessage}
            whatsappLink={whatsappLink}
            error={error}
            onCopy={() => {
              const text =
                share.visits.length === 1
                  ? `${window.location.origin}/cita/${share.visits[0]?.token ?? ""}`
                  : shareMessage;
              void navigator.clipboard.writeText(text);
              toast(share.visits.length === 1 ? "Enlace copiado" : "Mensaje copiado");
            }}
          />
        ) : null}

        <form
          id="appointment-form"
          noValidate
          onSubmit={handleSubmit}
          className={cn("space-y-6", share && "hidden")}
        >
          <p className="text-sm leading-relaxed text-muted">
            Elige quién viene, qué se atiende y cuándo. Si vienen varias mascotas, se agendan
            juntas.
          </p>

          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Quién viene</p>

              <Section
                icon={<UserRound className="h-4 w-4" />}
                title="Tutor"
                hint="Busca por nombre, teléfono o documento."
              >
                {selectedClient ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{selectedClient.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {ownerLine(selectedClient)}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearClient}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Buscar tutor"
                      value={lookupQuery}
                      onChange={(event) => setLookupQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void runSearch(event);
                        }
                      }}
                      placeholder="Nombre, teléfono o DNI"
                      autoComplete="off"
                    />
                    {lookupQuery.trim().length >= 2 ? (
                      lookupResults.length > 0 ? (
                        <ul className="overflow-hidden rounded-xl border border-border">
                          {lookupResults.map((client) => (
                            <li key={client.id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-background"
                                onClick={() => applyClient(client)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">
                                    {client.name}
                                  </span>
                                  <span className="block truncate text-xs text-muted">
                                    {ownerLine(client)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background px-3 py-3">
                          <p className="text-sm text-muted">Nadie coincide con esa búsqueda.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => askToRegister(lookupQuery)}
                          >
                            Registrar tutor
                          </Button>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
              </Section>

              {selectedClient ? (
                <Section
                  icon={<PawPrint className="h-4 w-4" />}
                  title="Mascotas"
                  hint={
                    pets.length > 1
                      ? "Puedes marcar más de una. El horario se reparte abajo."
                      : "Marca las que vienen a esta reserva."
                  }
                >
                  {pets.length === 0 ? (
                    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                      <p className="text-sm text-muted">
                        Este tutor no tiene mascotas. Registra una para continuar.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Nombre"
                          required
                          value={petName}
                          onChange={(event) => setPetName(event.target.value)}
                        />
                        <Input
                          label="Raza"
                          required
                          value={petBreed}
                          onChange={(event) => setPetBreed(event.target.value)}
                        />
                        <Select
                          label="Especie"
                          options={speciesOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          value={petSpecies}
                          onChange={(event) => setPetSpecies(event.target.value as Species)}
                        />
                        <Select
                          label="Sexo"
                          placeholder="Elegir"
                          options={sexOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          value={petSex}
                          onChange={(event) => setPetSex(event.target.value as Sex)}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingPet || !petSex || !petName.trim() || !petBreed.trim()}
                        onClick={() => void savePet()}
                      >
                        {savingPet ? "Guardando…" : "Registrar mascota"}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {pets.map((pet) => {
                        const selected = patientIds.includes(pet.id);
                        return (
                          <button
                            key={pet.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => togglePet(pet.id)}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary-light/50"
                                : "border-border bg-surface hover:border-primary/40",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                                selected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-surface text-transparent",
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{pet.name}</span>
                              <span className="block truncate text-xs text-muted">
                                {speciesLabel(pet.species)}
                                {pet.breed ? ` · ${pet.breed}` : ""}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {plannedVisits.length > 0 ? (
                    <div className="rounded-xl border border-border bg-background px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Orden de atención
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {plannedVisits.map((visit) => (
                          <li
                            key={visit.patientId}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="truncate font-medium">{visit.name}</span>
                            <span
                              className={
                                visit.fits ? "tabular-nums text-muted" : "font-medium text-danger"
                              }
                            >
                              {visit.fits ? visit.time : "No entra"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted">
                        {sameTime
                          ? "Grooming: se agendan a la misma hora."
                          : `Se encadenan cada ${durationMinutes} min.`}
                      </p>
                    </div>
                  ) : null}
                </Section>
              ) : null}
            </div>

            <div className="space-y-8 lg:border-l lg:border-border lg:pl-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">La cita</p>

              <Section
                icon={<Stethoscope className="h-4 w-4" />}
                title="Servicio"
                hint="Duración y precio salen del catálogo."
              >
                <Select
                  label="Servicio"
                  options={serviceChoices.map((service) => ({
                    value: service.id,
                    label: service.name,
                  }))}
                  value={selectedService?.id ?? ""}
                  onChange={(event) => chooseService(event.target.value)}
                />
                <p className="text-xs text-muted">
                  {durationMinutes} min · estimado {formatCurrency(estimatedPrice)}
                </p>
                <ChoiceGroup
                  label="Canal"
                  value={channel}
                  options={channelChoices}
                  onChange={setChannel}
                />
                <Select
                  label="Veterinario"
                  options={vets.map((vet) => ({ value: vet.id, label: vet.name }))}
                  value={veterinarianId}
                  onChange={(event) => setVeterinarianId(event.target.value)}
                />
              </Section>

              <Section
                icon={<CalendarClock className="h-4 w-4" />}
                title="Horario"
                hint="No se puede agendar en el pasado."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Fecha"
                    type="date"
                    required
                    min={clock.isoDate}
                    value={date}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      if (!nextDate || nextDate < clock.isoDate) {
                        const slot = openingAppointment(clock.isoDate);
                        setDate(slot.date);
                        setTime(slot.time);
                        return;
                      }
                      setDate(nextDate);
                      if (isPastAppointment(nextDate, time)) {
                        setTime(openingAppointment(nextDate).time);
                      }
                    }}
                  />
                  <Input
                    label="Hora"
                    type="time"
                    required
                    step={900}
                    min={date === clock.isoDate ? openingAppointment(date).time : undefined}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    error={
                      timeInPast
                        ? pastAppointmentMessage()
                        : scheduleBlocked
                          ? "Hay una mascota que no entra en este horario"
                          : undefined
                    }
                  />
                </div>
              </Section>

              <Section
                icon={<ClipboardList className="h-4 w-4" />}
                title="Detalle"
                hint="El motivo es lo que ve el cliente en el aviso."
              >
                <Input
                  label="Motivo"
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Control, vacunación…"
                />
                <Input
                  label="Notas internas"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Solo para el equipo"
                />
                <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={remindClient}
                    onChange={(event) => setRemindClient(event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      Avisar por WhatsApp
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {selectedClient?.phone
                        ? `Se abre el mensaje para ${formatPhone(selectedClient.phone)}.`
                        : "Si el tutor tiene celular, se abre el mensaje al guardar."}
                    </span>
                  </span>
                </label>
              </Section>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        dismissOnEscape={!registerOpen}
        title="Tutor no registrado"
        footer={
          <>
            <Button variant="outline" onClick={() => setPromptOpen(false)}>
              Seguir buscando
            </Button>
            <Button onClick={openRegister}>Registrar tutor</Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          No hay nadie con «{missingQuery}» en el padrón. Puedes registrarlo ahora y seguir con la
          cita.
        </p>
      </Modal>

      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Registrar tutor"
        size="form"
        footer={
          <>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="appointment-client-form">
              Guardar tutor
            </Button>
          </>
        }
      >
        <form id="appointment-client-form" onSubmit={saveClient} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nombre y apellido"
              required
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
            />
          </div>
          <Select
            label="Documento"
            options={[
              { value: "DNI", label: "DNI" },
              { value: "CE", label: "CE" },
            ]}
            value={registerDocumentType}
            onChange={(event) => setRegisterDocumentType(event.target.value as DocumentType)}
          />
          <Input
            label="Número"
            required
            value={registerDocument}
            onChange={(event) => setRegisterDocument(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
          <Input
            label="Teléfono"
            required
            value={registerPhone}
            onChange={(event) => setRegisterPhone(event.target.value)}
          />
          <Input
            label="Correo"
            type="email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
          />
        </form>
      </Modal>
    </>
  );
}

function SharePanel({
  share,
  shareMessage,
  whatsappLink,
  error,
  onCopy,
}: {
  share: {
    date: string;
    vetName: string;
    visits: { petName: string; time: string; token: string }[];
  };
  shareMessage: string;
  whatsappLink: string;
  error: string;
  onCopy: () => void;
}) {
  void shareMessage;
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-foreground">
        {share.visits.length === 1
          ? `${share.visits[0]?.petName ?? "La mascota"} quedó para el ${formatLongDate(share.date)} a las ${share.visits[0]?.time ?? ""}${share.vetName ? ` con ${share.vetName}` : ""}.`
          : `Quedaron agendadas ${share.visits.length} citas para el ${formatLongDate(share.date)}${share.vetName ? ` con ${share.vetName}` : ""}.`}
      </p>
      <div className="space-y-2">
        {share.visits.map((visit) => (
          <div key={visit.token} className="rounded-xl border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted">
              {visit.petName} · {visit.time}
            </p>
            <p className="mt-1 break-all text-sm font-medium">
              {`${typeof window === "undefined" ? "" : window.location.origin}/cita/${visit.token}`}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onCopy}>
          {share.visits.length === 1 ? "Copiar enlace" : "Copiar mensaje"}
        </Button>
        {whatsappLink ? (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button>Enviar por WhatsApp</Button>
          </a>
        ) : (
          <p className="text-sm text-muted">
            Este tutor no tiene un celular válido. Comparte el enlace de otra forma.
          </p>
        )}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-muted">
        {share.visits.length === 1
          ? "El tutor abre el enlace, ve la cita y confirma. No necesita cuenta."
          : "Cada enlace confirma a una mascota. No necesita cuenta."}
      </p>
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-primary bg-primary-light font-medium text-primary"
                  : "border-border bg-surface text-foreground hover:border-primary/40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ownerLine(client: Client) {
  const document = client.documentNumber?.trim();
  const identity = document
    ? `${client.documentType ? `${client.documentType} ` : ""}${document}`
    : "Sin documento";
  const phone = client.phone?.trim();
  return `${identity} · ${phone ? formatPhone(phone) : "Sin teléfono"}`;
}

function minutesToClock(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
