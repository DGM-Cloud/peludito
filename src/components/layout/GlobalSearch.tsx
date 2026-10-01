"use client";

import { searchService } from "@/services/search.service";
import { formatDate } from "@/utils/formatDate";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const results = searchService.search(query);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults =
    results.patients.length +
      results.clients.length +
      results.appointments.length >
    0;

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar mascota, cliente o cita…"
          aria-label="Búsqueda global"
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {open && query.length >= 2 ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {!hasResults ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No encontramos resultados.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.patients.length > 0 ? (
                <Group title="Mascotas">
                  {results.patients.map((p) => (
                    <Link
                      key={p.id}
                      href={`/patients/${p.id}`}
                      className="block px-4 py-2 text-sm hover:bg-background"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-muted">
                        {p.breed} · {p.id}
                      </span>
                    </Link>
                  ))}
                </Group>
              ) : null}
              {results.clients.length > 0 ? (
                <Group title="Clientes">
                  {results.clients.map((c) => (
                    <Link
                      key={c.id}
                      href={`/clients/${c.id}`}
                      className="block px-4 py-2 text-sm hover:bg-background"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-muted">{c.phone}</span>
                    </Link>
                  ))}
                </Group>
              ) : null}
              {results.appointments.length > 0 ? (
                <Group title="Citas">
                  {results.appointments.map((a) => (
                    <Link
                      key={a.id}
                      href="/appointments"
                      className="block px-4 py-2 text-sm hover:bg-background"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{a.reason}</span>
                      <span className="ml-2 text-muted">
                        {formatDate(a.date)} {a.time}
                      </span>
                    </Link>
                  ))}
                </Group>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}
