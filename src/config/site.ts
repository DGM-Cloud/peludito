export const siteConfig = {
  productName: "PELUDITO",
  productDescriptor: "Gestión para veterinarias",
  companyName: "DGM Cloud",
  companyUrl:
    process.env.NEXT_PUBLIC_DGM_URL ?? "https://dgmcloud.dev",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://peludito.dgmcloud.dev",
  title: "PELUDITO — Gestión para Veterinarias",
  description:
    "Gestiona citas, pacientes, historias clínicas, clientes e inventario de tu veterinaria con PELUDITO.",
  demoUser: {
    name: "Dra. Andrea Salazar",
    shortName: "Dra. Andrea",
    role: "Veterinaria principal",
    initials: "AS",
  },
} as const;
