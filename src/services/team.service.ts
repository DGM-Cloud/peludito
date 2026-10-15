import { api } from "@/lib/api";
import type { DemoRole } from "@/types/clinic";

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: DemoRole;
  veterinarianId: string | null;
  specialty: string | null;
  phone: string | null;
};

export type CreateTeamMemberInput = {
  fullName: string;
  email: string;
  password: string;
  role: DemoRole;
  specialty?: string;
  phone?: string;
};

export const teamService = {
  list(): Promise<TeamMember[]> {
    return api<TeamMember[]>("/team");
  },

  create(data: CreateTeamMemberInput): Promise<TeamMember> {
    return api<TeamMember>("/team", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
