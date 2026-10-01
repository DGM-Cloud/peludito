export const environment = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://peludito.dgmcloud.dev",
  dgmUrl: process.env.NEXT_PUBLIC_DGM_URL ?? "https://dgmcloud.dev",
  isDemo: true,
} as const;
