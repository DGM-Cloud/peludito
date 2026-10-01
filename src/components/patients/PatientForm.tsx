"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { speciesOptions, sexOptions } from "@/data/constants/categories";
import { clientsService } from "@/services/clients.service";
import type { CreatePatientInput, Species } from "@/types/patient";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePatientInput) => void;
  defaultClientId?: string;
};

export function PatientForm({
  open,
  onClose,
  onSubmit,
  defaultClientId,
}: Props) {
  const { toast } = useToast();
  const clients = clientsService.getClients();
  const [form, setForm] = useState({
    name: "",
    species: "perro" as Species,
    breed: "",
    sex: "hembra" as CreatePatientInput["sex"],
    birthDate: "",
    weight: "",
    microchip: "",
    allergies: "",
    clientId: defaultClientId ?? clients[0]?.id ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.breed || !form.birthDate || !form.clientId) return;

    onSubmit({
      name: form.name,
      species: form.species,
      breed: form.breed,
      sex: form.sex,
      birthDate: form.birthDate,
      weight: Number(form.weight) || 0,
      microchip: form.microchip || null,
      allergies: form.allergies
        ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
      clientId: form.clientId,
    });
    toast("✓ Paciente creado correctamente");
    onClose();
    setForm({
      name: "",
      species: "perro",
      breed: "",
      sex: "hembra",
      birthDate: "",
      weight: "",
      microchip: "",
      allergies: "",
      clientId: clients[0]?.id ?? "",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo paciente"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="patient-form">
            Guardar paciente
          </Button>
        </>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nombre"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Select
          label="Especie"
          options={speciesOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={form.species}
          onChange={(e) =>
            setForm({ ...form, species: e.target.value as Species })
          }
        />
        <Input
          label="Raza"
          required
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
        />
        <Select
          label="Sexo"
          options={sexOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={form.sex}
          onChange={(e) =>
            setForm({
              ...form,
              sex: e.target.value as CreatePatientInput["sex"],
            })
          }
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          required
          value={form.birthDate}
          onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
        />
        <Input
          label="Peso (kg)"
          type="number"
          step="0.1"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
        />
        <Input
          label="Microchip"
          value={form.microchip}
          onChange={(e) => setForm({ ...form, microchip: e.target.value })}
        />
        <Select
          label="Propietario"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Alergias (separadas por coma)"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
