"use client";

import {
  doseIntervalUnits,
  formatDoseCourse,
  formatDoseFrequency,
  medFormLabel,
  prescriptionLine,
  routesForMedication,
  searchVetMedications,
  type AdminRoute,
  type DoseIntervalUnit,
  type VetMedication,
} from "@/data/constants/vet-medications";
import { cn } from "@/utils/cn";
import { useState } from "react";

export function MedicationPlan({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VetMedication | null>(null);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("");
  const [route, setRoute] = useState<AdminRoute>("oral");
  const [once, setOnce] = useState(false);
  const [every, setEvery] = useState("12");
  const [intervalUnit, setIntervalUnit] = useState<DoseIntervalUnit>("horas");
  const [days, setDays] = useState("7");
  const matches = selected ? [] : searchVetMedications(query);
  const amountOk = Number(amount) > 0;
  const customName = query.trim();
  const showCustom =
    !selected &&
    customName.length >= 2 &&
    !matches.some((drug) => drug.name.toLowerCase() === customName.toLowerCase());

  const choose = (drug: VetMedication) => {
    setSelected(drug);
    setQuery(drug.name);
    setUnit(drug.units[0] ?? "");
    setRoute(routesForMedication(drug)[0] ?? "oral");
    setAmount("1");
    setOnce(drug.form === "vacuna" || drug.form === "pipeta");
    setEvery("12");
    setIntervalUnit("horas");
    setDays("7");
  };

  const frequency = formatDoseFrequency({
    once,
    every: Number(every),
    unit: intervalUnit,
  });
  const course = once ? "" : formatDoseCourse(Number(days));

  const add = () => {
    if (!selected || !amountOk || !unit || !frequency || (!once && !course)) return;
    const line = prescriptionLine({
      name: selected.name,
      amount: amount.replace(".", ","),
      unit,
      route,
      frequency,
      days: once ? undefined : Number(days),
    });
    if (!items.includes(line)) onChange([...items, line]);
    setSelected(null);
    setQuery("");
    setAmount("1");
    setUnit("");
    setRoute("oral");
    setOnce(false);
    setEvery("12");
    setIntervalUnit("horas");
    setDays("7");
  };

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Buscar pastilla, crema, vacuna…"
          aria-label="Buscar medicamento"
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {matches.length > 0 || showCustom ? (
          <ul className="absolute bottom-full z-20 mb-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
            {matches.map((drug) => (
              <li key={drug.id}>
                <button
                  type="button"
                  onClick={() => choose(drug)}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-background"
                >
                  <span className="text-sm font-medium text-foreground">{drug.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {medFormLabel[drug.form] === drug.category
                      ? medFormLabel[drug.form]
                      : `${medFormLabel[drug.form]} · ${drug.category}`}
                  </span>
                </button>
              </li>
            ))}
            {showCustom ? (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    choose({
                      id: `custom-${customName.toLowerCase()}`,
                      name: customName,
                      form: "comprimido",
                      category: "Otro",
                      units: ["mg", "g", "ml", "comprimido", "gota", "aplicación", "dosis"],
                    })
                  }
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-background"
                >
                  <span className="text-sm font-medium text-foreground">Usar «{customName}»</span>
                  <span className="shrink-0 text-xs text-muted">No está en el listado</span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block w-[5.5rem]">
            <span className="text-xs text-muted">Cantidad</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              aria-label="Cantidad"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block w-36">
            <span className="text-xs text-muted">Unidad</span>
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              aria-label="Unidad"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {selected.units.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-36">
            <span className="text-xs text-muted">Vía</span>
            {routesForMedication(selected).length < 2 ? (
              <span className="mt-1 flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                {route}
              </span>
            ) : (
              <select
                value={route}
                onChange={(event) => setRoute(event.target.value as AdminRoute)}
                aria-label="Vía"
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {routesForMedication(selected).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="min-w-[16rem] flex-1">
            <span className="text-xs text-muted">Frecuencia</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  "flex h-10 items-center rounded-lg border border-border bg-surface",
                  once && "opacity-45",
                )}
              >
                <span className="pl-3 text-sm text-muted">Cada</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={every}
                  disabled={once}
                  onChange={(event) => setEvery(event.target.value)}
                  onFocus={() => setOnce(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add();
                    }
                  }}
                  aria-label="Cada cuánto"
                  className="h-full w-14 bg-transparent px-2 text-sm outline-none disabled:cursor-not-allowed"
                />
                <select
                  value={intervalUnit}
                  disabled={once}
                  onChange={(event) => setIntervalUnit(event.target.value as DoseIntervalUnit)}
                  onFocus={() => setOnce(false)}
                  aria-label="Unidad de tiempo"
                  className="h-full rounded-r-lg border-l border-border bg-transparent px-2 text-sm outline-none disabled:cursor-not-allowed"
                >
                  {doseIntervalUnits.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setOnce((value) => !value)}
                aria-pressed={once}
                className={cn(
                  "h-10 rounded-lg border px-3 text-sm font-medium",
                  once
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground",
                )}
              >
                Una sola dosis
              </button>
            </div>
          </div>
          <label className={cn("block w-[7.5rem]", once && "opacity-45")}>
            <span className="text-xs text-muted">Durante</span>
            <span className="mt-1 flex h-10 items-center rounded-lg border border-border bg-surface pr-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={days}
                disabled={once}
                onChange={(event) => setDays(event.target.value)}
                onFocus={() => setOnce(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    add();
                  }
                }}
                aria-label="Días de tratamiento"
                className="h-full w-full bg-transparent px-3 text-sm outline-none disabled:cursor-not-allowed"
              />
              <span className="shrink-0 text-sm text-muted">días</span>
            </span>
          </label>
          <button
            type="button"
            disabled={!amountOk || !frequency || (!once && !course)}
            onClick={add}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto">
          {items.map((line) => {
            const [name, ...detail] = line.split(" · ");
            const structured = Boolean(name && detail.length > 0);
            return (
              <li
                key={line}
                className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 ring-1 ring-border"
              >
                {structured ? (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                    <span className="block truncate text-xs text-muted">{detail.join(" · ")}</span>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{line}</span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(items.filter((item) => item !== line))}
                  className="shrink-0 text-xs font-medium text-muted hover:text-foreground"
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted">Ningún medicamento agregado.</p>
      )}
    </div>
  );
}
