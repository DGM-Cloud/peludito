"use client";

import { cn } from "@/utils/cn";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "form" | "xl" | "2xl" | "wide";
  bodyClassName?: string;
  dismissOnEscape?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  bodyClassName,
  dismissOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !dismissOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissOnEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar modal"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex w-full min-h-0 flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl",
          size === "wide"
            ? "max-h-[calc(100dvh-3rem)] shadow-2xl sm:max-w-[1120px]"
            : "max-h-[90vh]",
          size === "md"
            ? "sm:max-w-lg"
            : size === "lg"
              ? "sm:max-w-2xl"
              : size === "form"
                ? "sm:max-w-3xl"
                : size === "xl"
                  ? "sm:max-w-5xl"
                  : size === "wide"
                    ? ""
                    : "sm:max-w-6xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2
            id="modal-title"
            className="pr-4 text-xl font-semibold leading-snug text-foreground"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar"
            className="!px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={cn("min-h-0 overflow-y-auto", bodyClassName ?? "px-6 py-5")}>
          {children}
        </div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
