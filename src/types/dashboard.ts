export type AlertItem = {
  id: string;
  type: "vaccine" | "stock" | "appointment" | "payment" | "hospitalization" | "expiry";
  message: string;
  severity: "info" | "warning" | "critical";
  href: string;
  actionLabel: string;
};

export type ActivityItem = {
  id: string;
  message: string;
  timestamp: string;
  type: "consultation" | "client" | "inventory" | "appointment" | "sale" | "vaccine";
};

export type DailyConsultations = {
  date: string;
  label: string;
  count: number;
};

export type MonthlySales = {
  month: string;
  total: number;
};

export type ServiceUsage = {
  name: string;
  count: number;
};

export type TopProduct = {
  name: string;
  quantity: number;
};

export type Medication = {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  active: boolean;
};
