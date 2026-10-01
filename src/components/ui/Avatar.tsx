import { cn } from "@/utils/cn";

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary-light font-semibold text-primary",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
