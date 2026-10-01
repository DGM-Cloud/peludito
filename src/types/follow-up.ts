export type FollowUpType =
  | "vacuna"
  | "control"
  | "desparasitacion"
  | "tratamiento"
  | "grooming"
  | "revision"
  | "no_show";

export type FollowUpStatus = "pendiente" | "contactado" | "completado" | "cancelado";

export type FollowUp = {
  id: string;
  patientId: string;
  clientId: string;
  type: FollowUpType;
  title: string;
  dueDate: string;
  status: FollowUpStatus;
  relatedId?: string;
  notes?: string;
};

export type CreateFollowUpInput = Omit<FollowUp, "id" | "status"> & {
  status?: FollowUpStatus;
};
