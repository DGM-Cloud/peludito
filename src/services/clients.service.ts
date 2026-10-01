import { clients as seedClients } from "@/data/mock/clients";
import type { Client, CreateClientInput } from "@/types/client";

let clientsStore: Client[] = [...seedClients];

export const clientsService = {
  getClients(): Client[] {
    return [...clientsStore];
  },

  getClientById(id: string): Client | undefined {
    return clientsStore.find((c) => c.id === id);
  },

  search(query: string): Client[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return clientsStore.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (digits.length >= 3 && c.phone.includes(digits)),
    );
  },

  findPossibleDuplicates(name: string, phone: string): Client[] {
    const n = name.toLowerCase().trim();
    const p = phone.replace(/\D/g, "");
    if (!n && !p) return [];
    return clientsStore.filter((c) => {
      const sameName = n.length >= 3 && c.name.toLowerCase().includes(n);
      const samePhone =
        p.length >= 6 && c.phone.replace(/\D/g, "").includes(p);
      return sameName || samePhone;
    });
  },

  createClient(data: CreateClientInput): Client {
    const client: Client = {
      ...data,
      id: `cli-${Date.now()}`,
      lastVisit: null,
      patientIds: data.patientIds ?? [],
    };
    clientsStore = [client, ...clientsStore];
    return client;
  },

  updateClient(id: string, data: Partial<Client>): Client | undefined {
    const index = clientsStore.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    clientsStore[index] = { ...clientsStore[index], ...data, id };
    return clientsStore[index];
  },
};
