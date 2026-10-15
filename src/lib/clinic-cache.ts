import { api } from "@/lib/api";
import type { Appointment } from "@/types/appointment";
import type { CatalogService } from "@/types/clinic";
import type { Client } from "@/types/client";
import type { ActivityItem, AlertItem, Medication } from "@/types/dashboard";
import type { FollowUp } from "@/types/follow-up";
import type { GroomingAppointment } from "@/types/grooming";
import type { Hospitalization } from "@/types/hospitalization";
import type { MedicalRecord } from "@/types/medical-record";
import type { InventoryBatch, InventoryMovement, Product } from "@/types/product";
import type { Patient } from "@/types/patient";
import type { Sale } from "@/types/sale";
import type { Vaccination, VaccineCatalogItem } from "@/types/vaccination";
import type { Veterinarian } from "@/types/veterinarian";
import { todayISODate } from "@/utils/formatDate";

export type ReportsPayload = {
  kpis: {
    appointmentsToday: number;
    waiting: number;
    attended: number;
    incomeToday: number;
    pendingPayments: number;
    hospitalized: number;
  };
  cash: {
    efectivo: number;
    yape: number;
    plin: number;
    tarjeta: number;
    total: number;
    count: number;
  };
  noShow: { total: number; noShows: number; canceladas: number };
  consultations: { date: string; label: string; count: number }[];
  monthlySales: { month: string; total: number }[];
  topServices: { name: string; count: number }[];
  topProducts: { name: string; quantity: number }[];
  activity: ActivityItem[];
  alerts: AlertItem[];
  stats: {
    total: number;
    atendidas: number;
    canceladas: number;
    noAsistieron: number;
    pendientes: number;
    esperando: number;
    noConfirmadas: number;
  };
};

export type ClinicSnapshot = {
  date: string;
  clients: Client[];
  patients: Patient[];
  veterinarians: Veterinarian[];
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  vaccinations: Vaccination[];
  vaccineCatalog: VaccineCatalogItem[];
  medications: Medication[];
  followUps: FollowUp[];
  hospitalizations: Hospitalization[];
  grooming: GroomingAppointment[];
  products: Product[];
  batches: InventoryBatch[];
  movements: InventoryMovement[];
  sales: Sale[];
  catalog: CatalogService[];
  reports: ReportsPayload;
};

let snapshot: ClinicSnapshot | null = null;

export function getSnapshot() {
  return snapshot;
}

export function rememberAppointment(appointment: Appointment) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    appointments: [
      ...snapshot.appointments.filter((item) => item.id !== appointment.id),
      appointment,
    ],
  };
}

export function rememberPatient(patient: Patient) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    patients: [...snapshot.patients.filter((item) => item.id !== patient.id), patient],
  };
}

export function rememberMedicalRecord(record: MedicalRecord) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    medicalRecords: [
      record,
      ...snapshot.medicalRecords.filter((item) => item.id !== record.id),
    ],
  };
}

export function rememberVaccination(vaccination: Vaccination) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    vaccinations: [
      vaccination,
      ...snapshot.vaccinations.filter((item) => item.id !== vaccination.id),
    ],
  };
}

export function rememberCatalog(service: CatalogService) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    catalog: snapshot.catalog.map((item) => (item.id === service.id ? service : item)),
  };
}

const emptyReports: ReportsPayload = {
  kpis: {
    appointmentsToday: 0,
    waiting: 0,
    attended: 0,
    incomeToday: 0,
    pendingPayments: 0,
    hospitalized: 0,
  },
  cash: { efectivo: 0, yape: 0, plin: 0, tarjeta: 0, total: 0, count: 0 },
  noShow: { total: 0, noShows: 0, canceladas: 0 },
  consultations: [],
  monthlySales: [],
  topServices: [],
  topProducts: [],
  activity: [],
  alerts: [],
  stats: {
    total: 0,
    atendidas: 0,
    canceladas: 0,
    noAsistieron: 0,
    pendientes: 0,
    esperando: 0,
    noConfirmadas: 0,
  },
};

export function readSnapshot(): ClinicSnapshot {
  return (
    snapshot ?? {
      date: todayISODate(),
      clients: [],
      patients: [],
      veterinarians: [],
      appointments: [],
      medicalRecords: [],
      vaccinations: [],
      vaccineCatalog: [],
      medications: [],
      followUps: [],
      hospitalizations: [],
      grooming: [],
      products: [],
      batches: [],
      movements: [],
      sales: [],
      catalog: [],
      reports: emptyReports,
    }
  );
}

export async function loadSnapshot() {
  const date = todayISODate();
  const [
    clients,
    patients,
    veterinarians,
    appointments,
    medicalRecords,
    vaccinations,
    vaccineCatalog,
    medications,
    followUps,
    hospitalizations,
    grooming,
    products,
    batches,
    movements,
    sales,
    catalog,
    reports,
  ] = await Promise.all([
    api<Client[]>("/clients"),
    api<Patient[]>("/patients"),
    api<Veterinarian[]>("/veterinarians"),
    api<Appointment[]>("/appointments"),
    api<MedicalRecord[]>("/medical-records"),
    api<Vaccination[]>("/vaccinations"),
    api<VaccineCatalogItem[]>("/vaccine-catalog").catch(() => [] as VaccineCatalogItem[]),
    api<Medication[]>("/medications"),
    api<FollowUp[]>("/follow-ups"),
    api<Hospitalization[]>("/hospitalizations"),
    api<GroomingAppointment[]>("/grooming"),
    api<Product[]>("/products"),
    api<InventoryBatch[]>("/batches"),
    api<InventoryMovement[]>("/movements"),
    api<Sale[]>("/sales"),
    api<CatalogService[]>("/catalog"),
    api<ReportsPayload>(`/reports?date=${date}`),
  ]);

  snapshot = {
    date,
    clients,
    patients,
    veterinarians,
    appointments,
    medicalRecords,
    vaccinations,
    vaccineCatalog,
    medications,
    followUps,
    hospitalizations,
    grooming,
    products,
    batches,
    movements,
    sales,
    catalog,
    reports,
  };
  return snapshot;
}
