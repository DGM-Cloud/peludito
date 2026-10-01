"use client";

import { Logo } from "@/components/layout/Logo";
import { siteConfig } from "@/config/site";
import { footerNavigation, mainNavigation } from "@/config/navigation";
import { useDemo } from "@/context/DemoProvider";
import { cn } from "@/utils/cn";
import {
  BarChart3,
  BedDouble,
  BellRing,
  Calendar,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Package,
  PawPrint,
  Scissors,
  Settings,
  Syringe,
  User,
  Users,
  Wallet,
  X,
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
  Settings,
  User,
};

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useDemo();

  const navItems = mainNavigation.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-text">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        {onClose ? (
          <button
            type="button"
            className="rounded-lg p-2 text-sidebar-text hover:bg-white/10 lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = icons[item.icon] ?? LayoutDashboard;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-sidebar-active"
                  : "hover:bg-white/5 hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <a
          href={siteConfig.companyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block rounded-lg bg-white/5 px-3 py-3 text-xs leading-relaxed text-sidebar-text hover:bg-white/10"
        >
          <p className="font-medium text-white">
            ¿Quieres una plataforma adaptada a tu veterinaria?
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-sidebar-active">
            Hablar con DGM Cloud
            <ExternalLink className="h-3 w-3" />
          </span>
        </a>

        <div className="space-y-1">
          {footerNavigation.map((item) => {
            const Icon = icons[item.icon] ?? Settings;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-sidebar-active"
                    : "hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        {content}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
