"use client";

import { mainNavigation } from "@/config/navigation";
import { useDemo } from "@/context/DemoProvider";
import { cn } from "@/utils/cn";
import {
  BarChart3,
  BedDouble,
  BellRing,
  Calendar,
  FileText,
  LayoutDashboard,
  Package,
  PawPrint,
  Scissors,
  Syringe,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const icons: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Calendar,
  PawPrint,
  Users,
  FileText,
  Syringe,
  Package,
  Wallet,
  Scissors,
  BedDouble,
  BellRing,
  BarChart3,
};

/** Prioridad móvil por rol: máximo 5 ítems más usados */
const mobilePriority: Record<string, string[]> = {
  recepcion: [
    "/dashboard",
    "/appointments",
    "/patients",
    "/follow-ups",
    "/pos",
  ],
  veterinario: [
    "/dashboard",
    "/appointments",
    "/patients",
    "/medical-records",
    "/hospitalization",
  ],
  caja: ["/dashboard", "/pos", "/inventory", "/clients", "/reports"],
  administrador: [
    "/dashboard",
    "/appointments",
    "/patients",
    "/pos",
    "/reports",
  ],
};

export function MobileNavigation() {
  const pathname = usePathname();
  const { role } = useDemo();

  const allowed = mainNavigation.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
  const priority = mobilePriority[role] ?? mobilePriority.administrador;
  const mobileItems = priority
    .map((href) => allowed.find((i) => i.href === href))
    .filter(Boolean)
    .slice(0, 5) as typeof mainNavigation;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navegación móvil"
    >
      <ul className="flex items-stretch justify-between">
        {mobileItems.map((item) => {
          const Icon = icons[item.icon] ?? LayoutDashboard;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
