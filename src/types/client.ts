import type { Sex, Species } from "@/types/patient";

export type DocumentType = "DNI" | "CE" | "PASAPORTE" | "OTRO";
export type ContactChannel = "llamada" | "whatsapp" | "correo";
export type ClientRelationship = "propietario" | "tutor" | "responsable";
export type ClientStatus = "activo" | "inactivo";

export type ClientContact = {
  id: string;
  name: string;
  phone: string;
  relationship: ClientRelationship;
  status: ClientStatus;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  phoneAlt?: string;
  email: string;
  documentType?: DocumentType;
  documentNumber?: string;
  ruc?: string;
  businessName?: string;
  birthDate?: string;
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  addressReference?: string;
  preferredChannel?: ContactChannel;
  allowCall?: boolean;
  allowWhatsapp?: boolean;
  allowEmail?: boolean;
  relationship?: ClientRelationship;
  status?: ClientStatus;
  privacyAcceptedAt?: string | null;
  notes?: string;
  contacts?: ClientContact[];
  createdAt?: string;
  createdByName?: string;
  updatedAt?: string | null;
  updatedByName?: string;
  lastVisit: string | null;
  patientIds: string[];
};

export type ClientPetInput = {
  name: string;
  species: Species;
  sex: Sex;
  breed?: string;
  birthDate?: string;
};

export type ClientContactInput = {
  id?: string;
  name: string;
  phone: string;
  relationship: ClientRelationship;
  status?: ClientStatus;
};

export type CreateClientInput = {
  name: string;
  phone?: string;
  phoneAlt?: string;
  email?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  ruc?: string;
  businessName?: string;
  birthDate?: string;
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  addressReference?: string;
  preferredChannel?: ContactChannel;
  allowCall?: boolean;
  allowWhatsapp?: boolean;
  allowEmail?: boolean;
  relationship?: ClientRelationship;
  status?: ClientStatus;
  privacyAccepted?: boolean;
  notes?: string;
  contacts?: ClientContactInput[];
  pets?: ClientPetInput[];
};
