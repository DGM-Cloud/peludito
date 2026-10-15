import { readSnapshot } from "@/lib/clinic-cache";
import type { Appointment } from "@/types/appointment";
import type { Client } from "@/types/client";
import type { Patient } from "@/types/patient";
import { clientMatchesQuery } from "@/utils/client-fields";

export type SearchResultGroup = {
  patients: Patient[];
  clients: Client[];
  appointments: Appointment[];
};

export const searchService = {
  search(query: string): SearchResultGroup {
    const q = query.trim().toLowerCase();
    const data = readSnapshot();
    if (q.length < 2) return { patients: [], clients: [], appointments: [] };
    return {
      patients: data.patients
        .filter(
          (item) =>
            item.name.toLowerCase().includes(q) || item.breed.toLowerCase().includes(q),
        )
        .slice(0, 5),
      clients: data.clients.filter((item) => clientMatchesQuery(item, q)).slice(0, 5),
      appointments: data.appointments
        .filter((item) => {
          const patient = data.patients.find((pet) => pet.id === item.patientId);
          const client = data.clients.find((person) => person.id === item.clientId);
          return (
            patient?.name.toLowerCase().includes(q) ||
            client?.name.toLowerCase().includes(q) ||
            item.reason.toLowerCase().includes(q)
          );
        })
        .slice(0, 5),
    };
  },
};
