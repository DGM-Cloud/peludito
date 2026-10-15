"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { demoRoles } from "@/config/demo";
import { useDemo } from "@/context/DemoProvider";
import { teamService, type TeamMember } from "@/services/team.service";
import type { DemoRole } from "@/types/clinic";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "veterinario" as DemoRole,
  specialty: "",
  phone: "",
};

export function TeamSettings() {
  const { role, refresh } = useDemo();
  const { toast } = useToast();
  const canEdit = role === "administrador";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    try {
      setMembers(await teamService.list());
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [canEdit, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canEdit) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await teamService.create({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        specialty: form.specialty.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast("✓ Miembro del equipo registrado");
      setForm(emptyForm);
      setShowForm(false);
      await load();
      void refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo registrar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Equipo"
        description="Registra usuarios de la clínica. Un veterinario queda vinculado a su cola de Mis consultas."
        action={
          !showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              Nuevo miembro
            </Button>
          ) : null
        }
      />

      {showForm ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mb-6 grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2"
        >
          <Input
            label="Nombre completo"
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <Input
            label="Correo"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Contraseña temporal"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select
            label="Rol"
            value={form.role}
            options={demoRoles.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as DemoRole }))
            }
          />
          {form.role === "veterinario" ? (
            <>
              <Input
                label="Especialidad"
                required
                value={form.specialty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialty: e.target.value }))
                }
              />
              <Input
                label="Teléfono"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </>
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Registrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando equipo…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay otros miembros registrados.</p>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3"
            >
              <div>
                <p className="text-sm font-medium">{member.fullName}</p>
                <p className="text-xs text-muted">{member.email}</p>
                {member.specialty ? (
                  <p className="text-xs text-muted">{member.specialty}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                {demoRoles.find((r) => r.id === member.role)?.label ?? member.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
