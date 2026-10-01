"use client";

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Avatar } from "@/components/ui/Avatar";
import { clinics, demoRoles } from "@/config/demo";
import { siteConfig } from "@/config/site";
import { useDemo } from "@/context/DemoProvider";
import type { DemoRole } from "@/types/clinic";
import { Menu } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { clinicId, setClinicId, role, setRole, roleLabel } = useDemo();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-foreground hover:bg-background lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <label className="hidden items-center lg:flex">
            <span className="sr-only">Sede</span>
            <select
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              className="h-9 max-w-[180px] rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
              aria-label="Seleccionar sede"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden items-center sm:flex">
            <span className="sr-only">Rol de trabajo</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DemoRole)}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
              aria-label="Vista por rol"
            >
              {demoRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2.5">
            <Avatar initials={siteConfig.demoUser.initials} size="sm" />
            <div className="hidden text-left xl:block">
              <p className="text-sm font-medium text-foreground">
                {siteConfig.demoUser.shortName}
              </p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
