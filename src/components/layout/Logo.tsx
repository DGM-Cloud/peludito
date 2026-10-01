import { cn } from "@/utils/cn";
import Link from "next/link";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex items-center gap-2.5 no-underline", className)}
      aria-label="PELUDITO — inicio"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-active text-white">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M12 3.5c1.2 0 2.2.9 2.2 2.1 0 .4-.1.8-.3 1.1 1.5.3 2.6 1.6 2.6 3.2v.4c1.1.5 1.8 1.6 1.8 2.9 0 1.8-1.4 3.2-3.2 3.2h-.4c-.4 1.4-1.7 2.4-3.2 2.4s-2.8-1-3.2-2.4h-.4C6.1 16.4 4.7 15 4.7 13.2c0-1.3.7-2.4 1.8-2.9v-.4c0-1.6 1.1-2.9 2.6-3.2-.2-.3-.3-.7-.3-1.1C8.8 4.4 9.8 3.5 11 3.5h1z"
            fill="currentColor"
            opacity="0.95"
          />
          <circle cx="9.2" cy="10.8" r="1" fill="#0f2922" />
          <circle cx="14.8" cy="10.8" r="1" fill="#0f2922" />
        </svg>
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-wide text-white">
            PELUDITO
          </span>
          <span className="text-[11px] text-sidebar-text">by DGM Cloud</span>
        </span>
      ) : null}
    </Link>
  );
}
