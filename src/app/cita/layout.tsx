import { Fraunces } from "next/font/google";
import type { Metadata, Viewport } from "next";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
});

export const viewport: Viewport = {
  themeColor: "#f7f4ee",
  colorScheme: "light",
};

export const metadata: Metadata = {
  other: {
    "color-scheme": "light",
  },
};

export default function CitaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} min-h-dvh bg-[#f7f4ee] text-[#14241f]`}
      style={{ colorScheme: "only light" }}
    >
      {children}
    </div>
  );
}
