"use client";

import { useToast } from "@/components/ui/Toast";
import { appointmentStatuses } from "@/data/constants/statuses";
import { appointmentsService } from "@/services/appointments.service";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { cn } from "@/utils/cn";
import {
  Ban,
  Check,
  LogIn,
  MessageCircle,
  PawPrint,
  Stethoscope,
  Undo2,
  UserX,
  Wallet,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Check;
  tone: "accent" | "default" | "danger";
  run: () => void;
};

const MENU_WIDTH = 268;
const MENU_HEIGHT = 340;

function placeMenu(x: number, y: number) {
  const pad = 8;
  const maxX = window.innerWidth - MENU_WIDTH - pad;
  const maxY = window.innerHeight - MENU_HEIGHT - pad;
  return {
    left: Math.max(pad, Math.min(x, maxX)),
    top: Math.max(pad, Math.min(y, maxY)),
  };
}

export function AppointmentContextMenu({
  appointment,
  patientName,
  x,
  y,
  onClose,
  onChangeStatus,
  onCorrect,
  onOpenConsult,
  onCharge,
  onOpenPatient,
}: {
  appointment: Appointment;
  patientName: string;
  x: number;
  y: number;
  onClose: () => void;
  onChangeStatus: (status: AppointmentStatus) => void;
  onCorrect: () => void;
  onOpenConsult: () => void;
  onCharge: () => void;
  onOpenPatient: () => void;
}) {
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const status = appointmentStatuses.find((s) => s.value === appointment.status);
  const { left, top } = placeMenu(x, y);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const go = (fn: () => void) => {
    onClose();
    fn();
  };

  const statusItem = (
    id: string,
    label: string,
    next: AppointmentStatus,
    icon: typeof Check,
    tone: MenuItem["tone"],
  ): MenuItem => ({
    id,
    label,
    icon,
    tone,
    run: () => go(() => onChangeStatus(next)),
  });

  const primary: MenuItem[] = [];
  const secondary: MenuItem[] = [];
  const danger: MenuItem[] = [];
  const extras: MenuItem[] = [];

  if (appointment.status === "programada") {
    primary.push(
      statusItem("confirm", "Confirmar cita", "confirmada", Check, "accent"),
    );
    secondary.push(
      statusItem("arrive", "Registrar llegada", "llego", LogIn, "default"),
    );
  } else if (appointment.status === "confirmada") {
    primary.push(
      statusItem("arrive", "Registrar llegada", "llego", LogIn, "accent"),
    );
    secondary.push({
      id: "consult",
      label: "Abrir consulta",
      icon: Stethoscope,
      tone: "default",
      run: () => go(onOpenConsult),
    });
  } else if (appointment.status === "llego") {
    primary.push({
      id: "consult",
      label: "Abrir consulta",
      icon: Stethoscope,
      tone: "accent",
      run: () => go(onOpenConsult),
    });
  } else if (appointment.status === "en_consulta") {
    primary.push({
      id: "consult",
      label: "Continuar consulta",
      icon: Stethoscope,
      tone: "accent",
      run: () => go(onOpenConsult),
    });
  } else if (appointment.status === "atendida") {
    primary.push({
      id: "charge",
      label: "Cobrar en caja",
      icon: Wallet,
      tone: "accent",
      run: () => go(onCharge),
    });
  }

  if (["programada", "confirmada"].includes(appointment.status)) {
    danger.push(
      statusItem("cancel", "Cancelar cita", "cancelada", Ban, "danger"),
      statusItem("noshow", "Marcar como no asistió", "no_asistio", UserX, "danger"),
    );
    extras.push({
      id: "wa",
      label: "Avisar por WhatsApp",
      icon: MessageCircle,
      tone: "default",
      run: () =>
        go(() => toast("Integración WhatsApp — próxima implementación.")),
    });
  } else if (appointment.status === "llego") {
    danger.push(
      statusItem("cancel", "Cancelar cita", "cancelada", Ban, "danger"),
    );
  }

  const correction: MenuItem[] = [];
  const correctionTarget = appointmentsService.getCorrectionTarget(appointment);
  if (correctionTarget) {
    const back =
      appointmentStatuses.find((s) => s.value === correctionTarget)?.label ??
      correctionTarget;
    correction.push({
      id: "correct",
      label: `Corregir: volver a ${back}`,
      icon: Undo2,
      tone: "default",
      run: () => go(onCorrect),
    });
  }

  extras.push({
    id: "patient",
    label: "Ver ficha del paciente",
    icon: PawPrint,
    tone: "default",
    run: () => go(onOpenPatient),
  });

  const closedNote =
    appointment.status === "pagada"
      ? "Esta cita ya fue cobrada."
      : appointment.status === "cancelada"
        ? "Esta cita fue cancelada."
        : appointment.status === "no_asistio"
          ? "El paciente no asistió."
          : null;

  const groups = [primary, secondary, danger, correction, extras].filter(
    (g) => g.length > 0,
  );

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Acciones de la cita de ${patientName}`}
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-50 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl"
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const items = [
          ...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ??
            []),
        ];
        if (items.length === 0) return;
        e.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          e.key === "ArrowDown"
            ? items[(current + 1 + items.length) % items.length]
            : items[(current - 1 + items.length) % items.length];
        next?.focus();
      }}
    >
      <div className="border-b border-border px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {patientName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {appointment.time} · {appointment.reason}
        </p>
        <p className="mt-1 text-xs font-medium text-foreground">
          {status?.label ?? appointment.status}
        </p>
      </div>

      {closedNote ? (
        <p className="px-3 py-2 text-xs text-muted">{closedNote}</p>
      ) : null}

      {groups.map((group, index) => (
        <div
          key={group[0]?.id ?? index}
          className={cn(index > 0 && "mt-1 border-t border-border pt-1")}
          role="group"
        >
          {group.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                autoFocus={item.id === primary[0]?.id}
                onClick={item.run}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                  item.tone === "accent" &&
                    "font-medium text-primary hover:bg-primary-light",
                  item.tone === "default" &&
                    "text-foreground hover:bg-background",
                  item.tone === "danger" && "text-danger hover:bg-danger-light",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}
