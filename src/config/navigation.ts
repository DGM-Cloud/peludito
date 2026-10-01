export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles?: Array<"recepcion" | "veterinario" | "caja" | "administrador">;
};

/** Navegación principal — filtrable por rol demo */
export const mainNavigation: NavItem[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["recepcion", "veterinario", "caja", "administrador"],
  },
  {
    label: "Citas",
    href: "/appointments",
    icon: "Calendar",
    roles: ["recepcion", "veterinario", "administrador"],
  },
  {
    label: "Pacientes",
    href: "/patients",
    icon: "PawPrint",
    roles: ["recepcion", "veterinario", "administrador"],
  },
  {
    label: "Clientes",
    href: "/clients",
    icon: "Users",
    roles: ["recepcion", "caja", "administrador"],
  },
  {
    label: "Historias clínicas",
    href: "/medical-records",
    icon: "FileText",
    roles: ["veterinario", "administrador"],
  },
  {
    label: "Vacunas",
    href: "/vaccines",
    icon: "Syringe",
    roles: ["recepcion", "veterinario", "administrador"],
  },
  {
    label: "Inventario",
    href: "/inventory",
    icon: "Package",
    roles: ["caja", "administrador"],
  },
  {
    label: "Caja",
    href: "/pos",
    icon: "Wallet",
    roles: ["caja", "recepcion", "administrador"],
  },
  {
    label: "Grooming",
    href: "/grooming",
    icon: "Scissors",
    roles: ["recepcion", "caja", "administrador"],
  },
  {
    label: "Hospitalización",
    href: "/hospitalization",
    icon: "BedDouble",
    roles: ["veterinario", "recepcion", "administrador"],
  },
  {
    label: "Seguimientos",
    href: "/follow-ups",
    icon: "BellRing",
    roles: ["recepcion", "administrador"],
  },
  {
    label: "Reportes",
    href: "/reports",
    icon: "BarChart3",
    roles: ["administrador", "caja"],
  },
];

export const footerNavigation: NavItem[] = [
  { label: "Configuración", href: "/settings", icon: "Settings" },
  { label: "Perfil", href: "/profile", icon: "User" },
];
