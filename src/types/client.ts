export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  lastVisit: string | null;
  patientIds: string[];
};

export type CreateClientInput = Omit<Client, "id" | "lastVisit" | "patientIds"> & {
  patientIds?: string[];
};
