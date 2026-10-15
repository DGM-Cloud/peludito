export type Veterinarian = {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  initials: string;
  /** Usuario auth vinculado (null = solo agenda, sin login). */
  userId?: string | null;
};
