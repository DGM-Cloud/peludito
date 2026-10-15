"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { clientsService } from "@/services/clients.service";
import type {
  Client,
  ClientRelationship,
  ClientStatus,
  ContactChannel,
  DocumentType,
} from "@/types/client";
import { cn } from "@/utils/cn";
import {
  birthDateError,
  channelOptions,
  documentError,
  documentTypeOptions,
  emailError,
  rucError,
  phoneDigits,
  phoneError,
  relationshipOptions,
  sameDocument,
  samePhone,
} from "@/utils/client-fields";
import { formatPhone } from "@/utils/formatPhone";
import { UbigeoFields } from "@/components/clients/UbigeoFields";
import { MapPin, PawPrint, Phone, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type ContactDraft = {
  key: string;
  name: string;
  phone: string;
  relationship: ClientRelationship;
  status: ClientStatus;
};

type Draft = {
  name: string;
  documentType: DocumentType | "";
  documentNumber: string;
  ruc: string;
  businessName: string;
  birthDate: string;
  phone: string;
  phoneAlt: string;
  email: string;
  preferredChannel: ContactChannel;
  allowCall: boolean;
  allowWhatsapp: boolean;
  allowEmail: boolean;
  address: string;
  district: string;
  province: string;
  department: string;
  addressReference: string;
  relationship: ClientRelationship;
  status: ClientStatus;
  notes: string;
  privacyAccepted: boolean;
  contacts: ContactDraft[];
};

const emptyDraft = (): Draft => ({
  name: "",
  documentType: "",
  documentNumber: "",
  ruc: "",
  businessName: "",
  birthDate: "",
  phone: "",
  phoneAlt: "",
  email: "",
  preferredChannel: "whatsapp",
  allowCall: false,
  allowWhatsapp: false,
  allowEmail: false,
  address: "",
  district: "",
  province: "",
  department: "",
  addressReference: "",
  relationship: "propietario",
  status: "activo",
  notes: "",
  privacyAccepted: false,
  contacts: [],
});

function draftKey() {
  return Math.random().toString(36).slice(2, 10);
}

function draftFromClient(client: Client): Draft {
  return {
    name: client.name,
    documentType: client.documentType ?? "",
    documentNumber: client.documentNumber ?? "",
    ruc: client.ruc ?? "",
    businessName: client.businessName ?? "",
    birthDate: client.birthDate ?? "",
    phone: client.phone,
    phoneAlt: client.phoneAlt ?? "",
    email: client.email,
    preferredChannel: client.preferredChannel ?? "whatsapp",
    allowCall: Boolean(client.allowCall),
    allowWhatsapp: Boolean(client.allowWhatsapp),
    allowEmail: Boolean(client.allowEmail),
    address: client.address ?? "",
    district: client.district ?? "",
    province: client.province ?? "",
    department: client.department ?? "",
    addressReference: client.addressReference ?? "",
    relationship: client.relationship ?? "propietario",
    status: client.status ?? "activo",
    notes: client.notes ?? "",
    privacyAccepted: Boolean(client.privacyAcceptedAt),
    contacts: (client.contacts ?? []).map((contact) => ({
      key: contact.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      status: contact.status,
    })),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  client?: Client;
  onCreated?: (result: Client & { warnings?: string[]; openPet?: boolean }) => void;
  allowPetIntake?: boolean;
  onSaved?: (client: Client) => void;
};

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export function ClientForm({ open, onClose, client, onCreated, onSaved, allowPetIntake = true }: Props) {
  const editing = Boolean(client);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [duplicates, setDuplicates] = useState<Client[]>([]);
  const [forcePhone, setForcePhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<(Client & { warnings?: string[] }) | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(client ? draftFromClient(client) : emptyDraft());
    setError("");
    setSubmitted(false);
    setDuplicates([]);
    setForcePhone(false);
    setSaving(false);
    setPending(null);
    // The open flag reloads the ficha. client?.id avoids resetting while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  useEffect(() => {
    if (!open) return;
    const phone = phoneDigits(draft.phone);
    const alt = phoneDigits(draft.phoneAlt);
    const document = draft.documentNumber.trim();
    const ruc = draft.ruc.replace(/\D/g, "");
    if (phone.length < 7 && alt.length < 7 && document.length < 3 && ruc.length < 11) {
      setDuplicates([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void clientsService
        .findPossibleDuplicates({
          phone,
          phoneAlt: alt,
          document,
          ruc,
        })
        .then((found) => setDuplicates(found.filter((item) => item.id !== client?.id)))
        .catch(() => setDuplicates([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, client?.id, draft.phone, draft.phoneAlt, draft.documentNumber, draft.ruc]);

  const patch = (next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setError("");
  };

  const documentHits = duplicates.filter((client) =>
    sameDocument(client.documentNumber, draft.documentNumber),
  );
  const rucHits = duplicates.filter(
    (item) => draft.ruc.replace(/\D/g, "").length === 11 && item.ruc === draft.ruc.replace(/\D/g, ""),
  );
  const phoneHits = duplicates.filter(
    (item) =>
      !documentHits.some((hit) => hit.id === item.id) &&
      !rucHits.some((hit) => hit.id === item.id) &&
      [draft.phone, draft.phoneAlt].some(
        (value) => samePhone(value, item.phone) || samePhone(value, item.phoneAlt),
      ),
  );

  const nameError = submitted && draft.name.trim().length < 2 ? "Escribe el nombre completo." : "";
  const docFieldError = submitted ? documentError(draft.documentType, draft.documentNumber) : "";
  const billingFieldError = submitted ? rucError(draft.ruc, draft.businessName) : "";
  const birthFieldError = submitted ? birthDateError(draft.birthDate) : "";
  const phoneFieldError = submitted ? phoneError(draft.phone) : "";
  const phoneAltFieldError = submitted ? phoneError(draft.phoneAlt) : "";
  const emailFieldError = submitted ? emailError(draft.email) : "";

  const firstProblem = () => {
    if (nameError || (!submitted && draft.name.trim().length < 2)) {
      return { section: "cliente-persona", message: "Escribe el nombre completo." };
    }
    const document = documentError(draft.documentType, draft.documentNumber);
    if (document) return { section: "cliente-persona", message: document };
    const billing = rucError(draft.ruc, draft.businessName);
    if (billing) return { section: "cliente-persona", message: billing };
    const born = birthDateError(draft.birthDate);
    if (born) return { section: "cliente-persona", message: born };
    const phone = phoneError(draft.phone) || phoneError(draft.phoneAlt) || emailError(draft.email);
    if (phone) return { section: "cliente-contacto", message: phone };
    if (documentHits.length > 0) {
      return {
        section: "cliente-persona",
        message: "Ese documento ya está registrado. Abre el cliente existente.",
      };
    }
    if (rucHits.length > 0) {
      return {
        section: "cliente-persona",
        message: "Ese RUC ya está registrado. Abre el cliente existente.",
      };
    }
    if (phoneHits.length > 0 && !forcePhone) {
      return {
        section: "cliente-contacto",
        message: editing
          ? "Ese teléfono ya está en otra ficha. Confírmalo antes de guardarlo aquí."
          : "Ese teléfono ya está registrado. Revísalo antes de crear otro cliente.",
      };
    }
    for (const contact of draft.contacts) {
      if (!contact.name.trim() || !phoneDigits(contact.phone)) {
        return {
          section: "cliente-mascotas",
          message: "Cada contacto autorizado necesita nombre y teléfono.",
        };
      }
      const invalid = phoneError(contact.phone);
      if (invalid) return { section: "cliente-mascotas", message: invalid };
    }
    return null;
  };

  const save = async () => {
    setSubmitted(true);
    const problem = firstProblem();
    if (problem) {
      setError(problem.message);
      document.getElementById(problem.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: draft.name.trim(),
      phone: phoneDigits(draft.phone),
      phoneAlt: phoneDigits(draft.phoneAlt),
      email: draft.email.trim(),
      documentType: draft.documentType || undefined,
      documentNumber: draft.documentNumber.trim(),
      ruc: draft.ruc.replace(/\D/g, ""),
      businessName: draft.businessName.trim(),
      birthDate: draft.birthDate || undefined,
      address: draft.address.trim(),
      district: draft.district.trim(),
      province: draft.province.trim(),
      department: draft.department.trim(),
      addressReference: draft.addressReference.trim(),
      preferredChannel: draft.preferredChannel,
      allowCall: draft.allowCall,
      allowWhatsapp: draft.allowWhatsapp,
      allowEmail: draft.allowEmail,
      relationship: draft.relationship,
      status: draft.status,
      privacyAccepted: draft.privacyAccepted || Boolean(client?.privacyAcceptedAt),
      notes: draft.notes.trim(),
      contacts: draft.contacts.map((contact) => ({
        id: contact.key,
        name: contact.name.trim(),
        phone: phoneDigits(contact.phone),
        relationship: contact.relationship,
        status: contact.status,
      })),
    };
    try {
      if (client) {
        const saved = await clientsService.updateClient(client.id, payload);
        onSaved?.(saved);
      } else {
        const created = await clientsService.createClient(payload);
        if (allowPetIntake) {
          setPending(created);
          return;
        }
        onCreated?.(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la ficha");
    } finally {
      setSaving(false);
    }
  };

  const finish = (openPet: boolean) => {
    if (!pending) return;
    const result = pending;
    setPending(null);
    onCreated?.({ ...result, openPet });
  };

  const updateContact = (key: string, next: Partial<ContactDraft>) =>
    patch({
      contacts: draft.contacts.map((item) => (item.key === key ? { ...item, ...next } : item)),
    });

  return (
    <Modal
      open={open}
      onClose={() => {
        if (pending) {
          finish(false);
          return;
        }
        onClose();
      }}
      title={pending ? "Cliente guardado" : editing ? "Editar ficha" : "Nuevo cliente"}
      size="form"
      footer={
        pending ? (
          <>
            <Button variant="outline" onClick={() => finish(false)}>
              Sí, ya está registrada
            </Button>
            <Button onClick={() => finish(true)}>No, registrar mascota</Button>
          </>
        ) : (
          <>
            <p className={cn("mr-auto text-xs", error ? "text-danger" : "text-muted")}>
              {error || "Solo el nombre es obligatorio."}
            </p>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              form="client-form"
              type="submit"
              disabled={saving || documentHits.length > 0 || rucHits.length > 0}
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar cliente"}
            </Button>
          </>
        )
      }
    >
      {pending ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{pending.name} quedó en el padrón.</p>
          {pending.documentNumber ? (
            <p className="text-sm text-muted">
              {pending.documentType ? `${pending.documentType} ` : ""}
              {pending.documentNumber}
            </p>
          ) : null}
          {pending.warnings?.[0] ? <p className="text-sm text-warning">{pending.warnings[0]}</p> : null}
          <p className="text-sm leading-relaxed text-muted">¿Ya tiene mascota registrada?</p>
        </div>
      ) : null}
      <form
        id="client-form"
        noValidate
        hidden={pending != null}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-8"
      >
        <p className="text-sm leading-relaxed text-muted">
          Baja por los bloques y completa lo que tengas a mano. Puedes guardar con el nombre y
          completar el resto después.
        </p>

        <Section
          id="cliente-persona"
          icon={<UserRound className="h-4 w-4" />}
          title="Persona"
          hint="Identificación del propietario o tutor."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Nombre completo"
                required
                value={draft.name}
                error={nameError}
                onChange={(event) => patch({ name: event.target.value })}
                autoComplete="name"
              />
            </div>
            <Select
              label="Tipo de documento"
              options={[{ value: "", label: "Sin documento" }, ...documentTypeOptions]}
              value={draft.documentType}
              error={docFieldError && !draft.documentType ? docFieldError : undefined}
              onChange={(event) =>
                patch({
                  documentType: event.target.value as DocumentType | "",
                  documentNumber: "",
                })
              }
            />
            <Input
              label="Número de documento"
              value={draft.documentNumber}
              error={docFieldError && draft.documentType ? docFieldError : undefined}
              inputMode={
                draft.documentType === "PASAPORTE" || draft.documentType === "OTRO"
                  ? "text"
                  : "numeric"
              }
              disabled={!draft.documentType}
              onChange={(event) => {
                const raw = event.target.value;
                const next =
                  draft.documentType === "DNI" || draft.documentType === "CE"
                    ? raw.replace(/\D/g, "").slice(0, draft.documentType === "DNI" ? 8 : 9)
                    : raw
                        .replace(/[^A-Za-z0-9]/g, "")
                        .slice(0, 12)
                        .toUpperCase();
                patch({ documentNumber: next });
              }}
            />
            <div className="sm:col-span-2 rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium">Facturación</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Opcional. Si asocias un RUC, en caja se puede emitir boleta como persona natural
                o factura con este RUC.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input
                  label="RUC"
                  inputMode="numeric"
                  value={draft.ruc}
                  error={billingFieldError && !/^(10|20)\d{9}$/.test(draft.ruc) ? billingFieldError : undefined}
                  onChange={(event) =>
                    patch({ ruc: event.target.value.replace(/\D/g, "").slice(0, 11) })
                  }
                />
                <Input
                  label="Razón social"
                  value={draft.businessName}
                  error={
                    billingFieldError && /^(10|20)\d{9}$/.test(draft.ruc)
                      ? billingFieldError
                      : undefined
                  }
                  onChange={(event) => patch({ businessName: event.target.value })}
                />
              </div>
              {rucHits.length > 0 ? (
                <div className="mt-3">
                  <DuplicateNotice
                    title="Ese RUC ya está registrado."
                    clients={rucHits}
                    onClose={onClose}
                  />
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={draft.birthDate}
                error={birthFieldError}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => patch({ birthDate: event.target.value })}
              />
              <p className="mt-1.5 text-xs text-muted">
                Solo si hace falta. No se pide para registrar una consulta.
              </p>
            </div>
          </div>
          {documentHits.length > 0 ? (
            <DuplicateNotice
              title="Ese documento ya está registrado."
              clients={documentHits}
              onClose={onClose}
            />
          ) : null}
        </Section>

        <Section
          id="cliente-contacto"
          icon={<Phone className="h-4 w-4" />}
          title="Contacto"
          hint="Datos y autorizaciones van por separado."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono principal"
              inputMode="numeric"
              value={draft.phone}
              error={phoneFieldError}
              onChange={(event) => {
                setForcePhone(false);
                patch({ phone: event.target.value.replace(/\D/g, "").slice(0, 11) });
              }}
            />
            <Input
              label="Teléfono alternativo"
              inputMode="numeric"
              value={draft.phoneAlt}
              error={phoneAltFieldError}
              onChange={(event) => {
                setForcePhone(false);
                patch({ phoneAlt: event.target.value.replace(/\D/g, "").slice(0, 11) });
              }}
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={draft.email}
              error={emailFieldError}
              onChange={(event) => patch({ email: event.target.value })}
              autoComplete="email"
            />
            <Select
              label="Canal preferido"
              options={channelOptions}
              value={draft.preferredChannel}
              onChange={(event) =>
                patch({ preferredChannel: event.target.value as ContactChannel })
              }
            />
          </div>

          {phoneHits.length > 0 ? (
            <DuplicateNotice
              title="Ese teléfono ya está registrado."
              clients={phoneHits}
              onClose={onClose}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForcePhone(true);
                    setError("");
                  }}
                >
                  {forcePhone ? "Se creará de todos modos" : "Crear de todos modos"}
                </Button>
              }
            />
          ) : null}

          <div className="rounded-xl border border-border bg-background/70 px-3 py-3">
            <p className="text-sm font-medium">Autorizaciones</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Guardar un número no autoriza a usarlo. Marca solo los avisos que el cliente aceptó.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Toggle
                pressed={draft.allowCall}
                onChange={(allowCall) => patch({ allowCall })}
                label="Llamadas"
              />
              <Toggle
                pressed={draft.allowWhatsapp}
                onChange={(allowWhatsapp) => patch({ allowWhatsapp })}
                label="WhatsApp"
              />
              <Toggle
                pressed={draft.allowEmail}
                onChange={(allowEmail) => patch({ allowEmail })}
                label="Correo"
              />
            </div>
          </div>
        </Section>

        <Section
          id="cliente-domicilio"
          icon={<MapPin className="h-4 w-4" />}
          title="Domicilio"
          hint="Empieza por el departamento. Provincia y distrito se filtran solos."
        >
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <Input
                label="Dirección"
                value={draft.address}
                onChange={(event) => patch({ address: event.target.value })}
              />
            </div>
            <UbigeoFields
              value={{
                department: draft.department,
                province: draft.province,
                district: draft.district,
              }}
              onChange={(place) => patch(place)}
            />
            <div className="sm:col-span-6">
              <Input
                label="Referencia"
                value={draft.addressReference}
                onChange={(event) => patch({ addressReference: event.target.value })}
                placeholder="Útil si hay visita a domicilio"
              />
            </div>
          </div>
        </Section>

        <Section
          id="cliente-mascotas"
          icon={<PawPrint className="h-4 w-4" />}
          title={editing ? "Mascotas y contactos" : "Contactos"}
          hint={
            editing ? "Relación, estado y quién más puede acompañar a la mascota." : ""
          }
        >
          {editing ? (
            <div className="space-y-4">
              <ChoiceGroup
                label="Relación con las mascotas"
                value={draft.relationship}
                options={relationshipOptions}
                fill
                onChange={(relationship) => patch({ relationship })}
              />
              <ChoiceGroup
                label="Estado"
                value={draft.status}
                options={statusOptions}
                onChange={(status) => patch({ status })}
              />
            </div>
          ) : null}

          <Block
            title="Contactos autorizados"
            hint="Quien puede recoger o acompañar a la mascota, sin crear otro propietario."
          >
            {draft.contacts.length > 0 ? (
              <ul className="space-y-3">
                {draft.contacts.map((contact, index) => {
                  const contactNameError =
                    submitted && !contact.name.trim() ? "Escribe el nombre." : "";
                  const contactPhoneError = submitted
                    ? !phoneDigits(contact.phone)
                      ? "Escribe el teléfono."
                      : phoneError(contact.phone)
                    : "";
                  return (
                    <li
                      key={contact.key}
                      className="rounded-xl border border-border bg-surface p-3 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Contacto {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            patch({
                              contacts: draft.contacts.filter((item) => item.key !== contact.key),
                            })
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Nombre"
                          value={contact.name}
                          error={contactNameError}
                          onChange={(event) =>
                            updateContact(contact.key, { name: event.target.value })
                          }
                        />
                        <Input
                          label="Teléfono"
                          inputMode="numeric"
                          value={contact.phone}
                          error={contactPhoneError}
                          onChange={(event) =>
                            updateContact(contact.key, {
                              phone: event.target.value.replace(/\D/g, "").slice(0, 11),
                            })
                          }
                        />
                        <Select
                          label="Relación"
                          options={relationshipOptions}
                          value={contact.relationship}
                          onChange={(event) =>
                            updateContact(contact.key, {
                              relationship: event.target.value as ClientRelationship,
                            })
                          }
                        />
                        <Select
                          label="Estado"
                          options={statusOptions}
                          value={contact.status}
                          onChange={(event) =>
                            updateContact(contact.key, {
                              status: event.target.value as ClientStatus,
                            })
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <AddRow
              label="Agregar contacto"
              onClick={() =>
                patch({
                  contacts: [
                    ...draft.contacts,
                    {
                      key: draftKey(),
                      name: "",
                      phone: "",
                      relationship: "responsable",
                      status: "activo",
                    },
                  ],
                })
              }
            />
          </Block>

          <label className="block text-sm font-medium">
            Observaciones
            <textarea
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm",
              draft.privacyAccepted
                ? "border-primary bg-primary-light/40"
                : "border-border bg-surface",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={draft.privacyAccepted}
              disabled={Boolean(client?.privacyAcceptedAt)}
              onChange={(event) => patch({ privacyAccepted: event.target.checked })}
            />
            <span>
              <span className="font-medium">Acepta el aviso de privacidad</span>
              <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted">
                {client?.privacyAcceptedAt
                  ? "Ya quedó registrado en la ficha."
                  : "Para la atención y los recordatorios que autorizó arriba."}
              </span>
            </span>
          </label>
        </Section>
      </form>
    </Modal>
  );
}

function Section({
  id,
  icon,
  title,
  hint,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-4 border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-background/80 p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  fill = false,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  fill?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div
        className={cn("mt-1.5 gap-1.5", fill ? "grid" : "flex flex-wrap")}
        style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-center text-sm transition-colors",
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

function Toggle({
  pressed,
  onChange,
  label,
}: {
  pressed: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        pressed
          ? "border-primary bg-primary-light font-medium text-primary"
          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function DuplicateNotice({
  title,
  clients,
  onClose,
  action,
}: {
  title: string;
  clients: Client[];
  onClose: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-warning bg-warning-light/50 px-3 py-3 text-sm">
      <p className="font-medium text-warning">{title}</p>
      <ul className="mt-2 space-y-2">
        {clients.map((client) => (
          <li key={client.id} className="flex items-center justify-between gap-3">
            <span>
              {client.name}
              {client.phone ? ` · ${formatPhone(client.phone)}` : ""}
              {client.documentNumber ? ` · ${client.documentNumber}` : ""}
            </span>
            <Link
              href={`/clients/${client.id}`}
              className="shrink-0 font-medium text-primary hover:underline"
              onClick={onClose}
            >
              Ver cliente
            </Link>
          </li>
        ))}
      </ul>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
