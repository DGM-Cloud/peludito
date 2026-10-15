import { readSnapshot } from "@/lib/clinic-cache";
import type { Veterinarian } from "@/types/veterinarian";

export const veterinariansService = {
  getVeterinarians(): Veterinarian[] {
    return readSnapshot().veterinarians;
  },

  getVeterinarianById(id: string): Veterinarian | undefined {
    return this.getVeterinarians().find((vet) => vet.id === id);
  },
};
