"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useDemo } from "@/context/DemoProvider";
import { useModal } from "@/hooks/useModal";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { formatPhone } from "@/utils/formatPhone";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ClientsView() {
  const { version, refresh } = useDemo();
  const { toast } = useToast();
  const modal = useModal();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [duplicates, setDuplicates] = useState(
    [] as ReturnType<typeof clientsService.findPossibleDuplicates>,
  );
  const [forceCreate, setForceCreate] = useState(false);

  const clients = useMemo(
    () => clientsService.getClients(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [clients, query]);

  const checkDup = (n: string, p: string) => {
    const found = clientsService.findPossibleDuplicates(n, p);
    setDuplicates(found);
    return found;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    const found = checkDup(name, phone);
    if (found.length > 0 && !forceCreate) return;

    clientsService.createClient({ name, phone, email, address });
    toast("✓ Cliente creado correctamente");
    modal.closeModal();
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDuplicates([]);
    setForceCreate(false);
    refresh();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar cliente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar clientes"
        />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={modal.openModal}>
          Nuevo cliente
        </Button>
      </div>

      <Card padding={false}>
        <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH>Teléfono</TH>
                <TH>Email</TH>
                <TH>Mascotas</TH>
                <TH>Última visita</TH>
                <TH>Compras</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((c) => {
                const pets = patientsService.getPatientsByClientId(c.id);
                const salesTotal = salesService
                  .getSalesByClientId(c.id)
                  .reduce((a, s) => a + s.total, 0);
                return (
                  <TR key={c.id}>
                    <TD>
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TD>
                    <TD>{formatPhone(c.phone)}</TD>
                    <TD>{c.email}</TD>
                    <TD>{pets.map((p) => p.name).join(", ") || "—"}</TD>
                    <TD>{c.lastVisit ? formatDate(c.lastVisit) : "—"}</TD>
                    <TD>{salesTotal ? formatCurrency(salesTotal) : "—"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {filtered.map((c) => {
            const pets = patientsService.getPatientsByClientId(c.id);
            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="block px-4 py-4 hover:bg-background"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted">{formatPhone(c.phone)}</p>
                <p className="mt-1 text-xs text-muted">
                  {pets.map((p) => p.name).join(", ")}
                </p>
              </Link>
            );
          })}
        </div>
      </Card>

      <Modal
        open={modal.open}
        onClose={() => {
          modal.closeModal();
          setDuplicates([]);
          setForceCreate(false);
        }}
        title="Nuevo cliente"
        footer={
          <>
            <Button variant="outline" onClick={modal.closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="client-form">
              {duplicates.length && !forceCreate
                ? "Revisar duplicados"
                : "Guardar cliente"}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={submit} className="grid gap-4">
          <Input
            label="Nombre"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setForceCreate(false);
              checkDup(e.target.value, phone);
            }}
          />
          <Input
            label="Teléfono"
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setForceCreate(false);
              checkDup(name, e.target.value);
            }}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {duplicates.length > 0 ? (
            <div className="rounded-lg border border-warning bg-warning-light/40 p-3 text-sm">
              <p className="font-medium text-warning">
                ¿Quizás este cliente ya existe?
              </p>
              <ul className="mt-2 space-y-2">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span>
                      {d.name} · {formatPhone(d.phone)}
                    </span>
                    <Link
                      href={`/clients/${d.id}`}
                      className="text-primary hover:underline"
                      onClick={modal.closeModal}
                    >
                      Ver cliente
                    </Link>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setForceCreate(true)}
              >
                Crear de todos modos
              </Button>
              {forceCreate ? (
                <p className="mt-2 text-xs text-muted">
                  Confirma con Guardar para crear el duplicado.
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
