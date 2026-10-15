"use client";

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Avatar } from "@/components/ui/Avatar";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useDemo } from "@/context/DemoProvider";
import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { clinic, roleLabel, fullName } = useDemo();
  const router = useRouter();
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const logout = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

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
          <p className="hidden max-w-[180px] truncate text-xs text-muted lg:block">
            {clinic.name}
          </p>
          <p className="hidden text-xs text-muted sm:block">{roleLabel}</p>
          <div className="flex items-center gap-2.5">
            <Avatar initials={initials || "P"} size="sm" />
            <div className="hidden text-left xl:block">
              <p className="text-sm font-medium text-foreground">{fullName}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
