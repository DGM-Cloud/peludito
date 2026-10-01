export type Clinic = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type DemoRole =
  | "recepcion"
  | "veterinario"
  | "caja"
  | "administrador";

export type CatalogService = {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
};
