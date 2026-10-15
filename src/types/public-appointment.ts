export type PublicAppointment = {
  status: string;
  clientReply: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  reason: string;
  serviceType: string;
  estimatedPrice: number;
  petName: string;
  species: string;
  breed: string;
  vetName: string;
  vetSpecialty: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clientFirstName: string;
};
