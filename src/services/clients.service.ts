import { api } from "@/lib/api";
import { readSnapshot } from "@/lib/clinic-cache";
import type { Client, CreateClientInput } from "@/types/client";
import { clientMatchesQuery } from "@/utils/client-fields";

export const clientsService = {
  getClients(): Client[] {
    return readSnapshot().clients;
  },

  getClientById(id: string): Client | undefined {
    return this.getClients().find((client) => client.id === id);
  },

  search(query: string): Client[] {
    return this.getClients().filter((client) => clientMatchesQuery(client, query));
  },

  async findByDocument(documentNumber: string): Promise<Client | null> {
    const digits = documentNumber.replace(/\D/g, "");
    return api<Client | null>(`/clients/lookup?document=${digits}`);
  },

  searchByNameOrDocument(query: string): Client[] {
    return this.getClients().filter((client) => clientMatchesQuery(client, query));
  },

  async findPossibleDuplicates(input: {
    phone?: string;
    phoneAlt?: string;
    document?: string;
    ruc?: string;
  }): Promise<Client[]> {
    const params = new URLSearchParams();
    if (input.phone) params.set("phone", input.phone);
    if (input.phoneAlt) params.set("phoneAlt", input.phoneAlt);
    if (input.document) params.set("document", input.document);
    if (input.ruc) params.set("ruc", input.ruc);
    if ([...params.keys()].length === 0) return [];
    return api<Client[]>(`/clients/duplicates?${params.toString()}`);
  },

  async createClient(data: CreateClientInput): Promise<Client & { warnings?: string[] }> {
    return api<Client & { warnings?: string[] }>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return api<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

