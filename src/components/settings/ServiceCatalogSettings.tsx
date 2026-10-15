"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useDemo } from "@/context/DemoProvider";
import { catalogService } from "@/services/catalog.service";
import { useState } from "react";

export function ServiceCatalogSettings() {
  const { role, publish, version } = useDemo();
  const { toast } = useToast();
  const services = catalogService.getServices();
  void version;
  const canEdit = role === "administrador";
  const [drafts, setDrafts] = useState<Record<string, { price: string; duration: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const valueOf = (id: string, price: number, duration: number) => {
    const draft = drafts[id];
    return {
      price: draft?.price ?? String(price),
      duration: draft?.duration ?? String(duration),
    };
  };

  const save = async (id: string) => {
    const service = services.find((item) => item.id === id);
    if (!service) return;
    const draft = valueOf(id, service.price, service.durationMinutes);
    const price = Number(draft.price);
    const durationMinutes = Number(draft.duration);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(durationMinutes)) {
      toast("Revisa el precio y la duración.");
      return;
    }
    setSavingId(id);
    try {
      await catalogService.updateService(id, { price, durationMinutes });
      publish();
      toast("✓ Servicio actualizado");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Servicios de cita"
        description="El precio estimado y la duración se usan al crear una cita y para detectar horarios cruzados."
      />
      {services.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay servicios en el catálogo.</p>
      ) : (
        <ul className="divide-y divide-border">
          {services.map((service) => {
            const draft = valueOf(service.id, service.price, service.durationMinutes);
            return (
              <li
                key={service.id}
                className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_8rem_8rem_auto]"
              >
                <div>
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="text-xs capitalize text-muted">{service.category}</p>
                </div>
                <Input
                  label="Precio S/"
                  inputMode="decimal"
                  disabled={!canEdit}
                  value={draft.price}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [service.id]: { ...draft, price: event.target.value },
                    }))
                  }
                />
                <Input
                  label="Minutos"
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={draft.duration}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [service.id]: { ...draft, duration: event.target.value },
                    }))
                  }
                />
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === service.id}
                    onClick={() => void save(service.id)}
                  >
                    {savingId === service.id ? "Guardando…" : "Guardar"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit ? null : (
        <p className="mt-3 text-xs text-muted">Solo un administrador puede cambiar estos valores.</p>
      )}
    </Card>
  );
}
