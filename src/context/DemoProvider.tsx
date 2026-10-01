"use client";

import { clinics, demoRoles } from "@/config/demo";
import type { Clinic, DemoRole } from "@/types/clinic";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DemoContextValue = {
  clinicId: string;
  setClinicId: (id: string) => void;
  clinic: Clinic;
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  roleLabel: string;
  version: number;
  refresh: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [clinicId, setClinicIdState] = useState<string>(clinics[0].id);
  const [role, setRole] = useState<DemoRole>("recepcion");
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const setClinicId = useCallback((id: string) => setClinicIdState(id), []);

  const clinic = useMemo((): Clinic => {
    const found = clinics.find((c) => c.id === clinicId) ?? clinics[0];
    return {
      id: found.id,
      name: found.name,
      address: found.address,
      phone: found.phone,
    };
  }, [clinicId]);

  const roleLabel = demoRoles.find((r) => r.id === role)?.label ?? "Recepción";

  const value = useMemo(
    () => ({
      clinicId,
      setClinicId,
      clinic,
      role,
      setRole,
      roleLabel,
      version,
      refresh,
    }),
    [clinicId, setClinicId, clinic, role, roleLabel, version, refresh],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
