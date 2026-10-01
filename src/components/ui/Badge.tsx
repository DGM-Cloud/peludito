import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const styles: Record<BadgeVariant, string> = {
  default: "bg-background text-foreground border-border",
  primary: "bg-primary-light text-primary border-transparent",
  success: "bg-success-light text-success border-transparent",
  warning: "bg-warning-light text-warning border-transparent",
  danger: "bg-danger-light text-danger border-transparent",
  muted: "bg-gray-100 text-muted border-transparent",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
