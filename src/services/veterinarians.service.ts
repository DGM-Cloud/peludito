import { veterinarians as seedVets } from "@/data/mock/veterinarians";
import type { Veterinarian } from "@/types/veterinarian";

export const veterinariansService = {
  getVeterinarians(): Veterinarian[] {
    return [...seedVets];
  },

  getVeterinarianById(id: string): Veterinarian | undefined {
    return seedVets.find((v) => v.id === id);
  },
};
