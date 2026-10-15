"use client";

import { api } from "@/lib/api";
import { loadSnapshot } from "@/lib/clinic-cache";
import { demoRoles } from "@/config/demo";
import type { Clinic, DemoRole } from "@/types/clinic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Session = {
  id: string;
  fullName: string;
  email: string;
  role: DemoRole;
  clinic: Clinic;
  veterinarianId: string | null;
};

type DemoContextValue = {
  clinicId: string;
  clinic: Clinic;
  role: DemoRole;
  roleLabel: string;
  fullName: string;
  email: string;
  /** Veterinario vinculado al usuario logueado (null si no aplica). */
  veterinarianId: string | null;
  version: number;
  ready: boolean;
  refresh: () => Promise<void>;
  publish: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const me = await api<Session>("/me");
    setSession(me);
    await loadSnapshot();
    setVersion((current) => current + 1);
    setReady(true);
    setError(null);
  }, []);

  useEffect(() => {
    load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos.");
      setReady(false);
    });
  }, [load]);

  const refresh = useCallback(async () => {
    await loadSnapshot();
    setVersion((current) => current + 1);
  }, []);

  const publish = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const value = useMemo(() => {
    if (!session) return null;
    return {
      clinicId: session.clinic.id,
      clinic: session.clinic,
      role: session.role,
      roleLabel: demoRoles.find((item) => item.id === session.role)?.label ?? "Recepción",
      fullName: session.fullName,
      email: session.email,
      veterinarianId: session.veterinarianId ?? null,
      version,
      ready,
      refresh,
      publish,
    };
  }, [session, version, ready, refresh, publish]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold">No se pudo abrir la clínica</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-primary"
            onClick={() => {
              setError(null);
              setReady(false);
              void load();
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!ready || !value) {
    return <ClinicLoadingScreen />;
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

function ClinicLoadingScreen() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar text-sidebar-active">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3.5c1.2 0 2.2.9 2.2 2.1 0 .4-.1.8-.3 1.1 1.5.3 2.6 1.6 2.6 3.2v.4c1.1.5 1.8 1.6 1.8 2.9 0 1.8-1.4 3.2-3.2 3.2h-.4c-.4 1.4-1.7 2.4-3.2 2.4s-2.8-1-3.2-2.4h-.4C6.1 16.4 4.7 15 4.7 13.2c0-1.3.7-2.4 1.8-2.9v-.4c0-1.6 1.1-2.9 2.6-3.2-.2-.3-.3-.7-.3-1.1C8.8 4.4 9.8 3.5 11 3.5h1z"
            fill="currentColor"
          />
        </svg>
      </span>
      <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-primary" />
      <p className="mt-4 text-base font-semibold text-foreground">Cargando clínica…</p>
      <p className="mt-1 text-sm text-muted">Preparando el panel y los módulos</p>
    </div>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
