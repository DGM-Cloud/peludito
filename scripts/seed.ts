import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { catalogServices, clinics } from "../src/config/demo";
import { recentActivity } from "../src/data/mock/activity";
import { appointments } from "../src/data/mock/appointments";
import { clients } from "../src/data/mock/clients";
import { followUps } from "../src/data/mock/follow-ups";
import { groomingAppointments } from "../src/data/mock/grooming";
import { hospitalizations } from "../src/data/mock/hospitalizations";
import { inventoryBatches, inventoryMovements, products } from "../src/data/mock/inventory";
import { medicalRecords } from "../src/data/mock/medical-records";
import { patients } from "../src/data/mock/patients";
import { sales } from "../src/data/mock/sales";
import { medications, vaccinations } from "../src/data/mock/vaccinations";
import { veterinarians } from "../src/data/mock/veterinarians";

const ANCHOR = "2026-09-22";
const DEFAULT_CLINIC = "clinic-1";

function loadEnvFile() {
  const file = resolve(process.cwd(), ".env.local");
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error("Crea .env.local con las claves de Supabase antes de ejecutar npm run seed.");
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function stableUuid(id: string) {
  const bytes = createHash("sha256").update(`peludito:${id}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function todayISODate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays() {
  const anchor = new Date(`${ANCHOR}T00:00:00`);
  const today = new Date(`${todayISODate()}T00:00:00`);
  return Math.round((today.getTime() - anchor.getTime()) / 86_400_000);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function shiftDate(value: string | null | undefined) {
  if (!value) return value ?? null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(value);
  if (!match || Number(match[1]) < 2026) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + shiftDays());
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}${match[4]}`;
}

function id(value: string) {
  return stableUuid(value);
}

function clinicId(value?: string | null) {
  return id(value || DEFAULT_CLINIC);
}

type SeedClient = {
  from: (table: string) => {
    upsert: (
      rows: Record<string, unknown>[],
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

async function save(supabase: SeedClient, table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SeedClient;

  await save(
    supabase,
    "clinics",
    clinics.map((clinic) => ({
      id: id(clinic.id),
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
    })),
  );

  await save(
    supabase,
    "veterinarians",
    veterinarians.map((vet) => ({
      id: id(vet.id),
      clinic_id: clinicId(),
      name: vet.name,
      specialty: vet.specialty,
      email: vet.email,
      phone: vet.phone,
      initials: vet.initials,
    })),
  );

  await save(
    supabase,
    "clients",
    clients.map((client) => ({
      id: id(client.id),
      clinic_id: clinicId(),
      name: client.name,
      phone: client.phone,
      email: client.email,
      document_type: client.documentType ?? null,
      document_number: client.documentNumber ?? null,
      address: client.address ?? null,
      last_visit: shiftDate(client.lastVisit),
    })),
  );

  await save(
    supabase,
    "patients",
    patients.map((patient) => ({
      id: id(patient.id),
      clinic_id: clinicId(),
      client_id: id(patient.clientId),
      name: patient.name,
      species: patient.species,
      breed: patient.breed,
      sex: patient.sex,
      birth_date: patient.birthDate,
      weight: patient.weight,
      microchip: patient.microchip ?? null,
      allergies: patient.allergies,
      status: patient.status,
      last_visit: shiftDate(patient.lastVisit),
    })),
  );

  await save(
    supabase,
    "products",
    products.map((product) => ({
      id: id(product.id),
      clinic_id: clinicId(),
      name: product.name,
      category: product.category,
      stock: product.stock,
      min_stock: product.minStock,
      price: product.price,
      unit: product.unit,
      presentation: product.presentation ?? null,
      provider: product.provider ?? null,
    })),
  );

  await save(
    supabase,
    "inventory_batches",
    inventoryBatches.map((batch) => ({
      id: id(batch.id),
      clinic_id: clinicId(),
      product_id: id(batch.productId),
      lot: batch.lot,
      expiry_date: shiftDate(batch.expiryDate),
      quantity: batch.quantity,
      provider: batch.provider,
      received_at: shiftDate(batch.receivedAt),
    })),
  );

  await save(
    supabase,
    "medical_records",
    medicalRecords.map((record) => ({
      id: id(record.id),
      clinic_id: clinicId(),
      patient_id: id(record.patientId),
      veterinarian_id: id(record.veterinarianId),
      date: shiftDate(record.date),
      reason: record.reason,
      symptoms: record.symptoms,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      medications: record.medications,
      observations: record.observations ?? null,
      status: record.status,
    })),
  );

  await save(
    supabase,
    "sales",
    sales.map((sale) => ({
      id: id(sale.id),
      clinic_id: clinicId(sale.clinicId),
      client_id: id(sale.clientId),
      patient_id: sale.patientId ? id(sale.patientId) : null,
      date: shiftDate(sale.date),
      time: sale.time,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.paymentMethod,
      voucher_type: sale.voucherType,
      voucher_number: sale.voucherNumber ?? null,
      document_number: sale.documentNumber ?? null,
      business_name: sale.businessName ?? null,
      notes: sale.notes ?? null,
      appointment_id: sale.appointmentId ? id(sale.appointmentId) : null,
    })),
  );

  await save(
    supabase,
    "sale_items",
    sales.flatMap((sale) =>
      sale.items.map((item) => ({
        id: id(item.id),
        sale_id: id(sale.id),
        type: item.type,
        reference_id: item.referenceId.startsWith("svc-")
          ? id(`${sale.clinicId}:${item.referenceId}`)
          : id(item.referenceId),
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      })),
    ),
  );

  await save(
    supabase,
    "inventory_movements",
    inventoryMovements.map((movement) => ({
      id: id(movement.id),
      clinic_id: clinicId(),
      product_id: id(movement.productId),
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      date: shiftDate(movement.date),
      sale_id: movement.saleId ? id(movement.saleId) : null,
    })),
  );

  await save(
    supabase,
    "appointments",
    appointments.map((appointment) => ({
      id: id(appointment.id),
      clinic_id: clinicId(appointment.clinicId),
      patient_id: id(appointment.patientId),
      client_id: id(appointment.clientId),
      veterinarian_id: id(appointment.veterinarianId),
      date: shiftDate(appointment.date),
      time: appointment.time,
      reason: appointment.reason,
      service_type: appointment.serviceType,
      notes: appointment.notes ?? null,
      status: appointment.status,
      status_before: null,
      medical_record_id: appointment.medicalRecordId ? id(appointment.medicalRecordId) : null,
      sale_id: appointment.saleId ? id(appointment.saleId) : null,
    })),
  );

  await save(
    supabase,
    "vaccinations",
    vaccinations.map((vaccine) => ({
      id: id(vaccine.id),
      clinic_id: clinicId(),
      patient_id: id(vaccine.patientId),
      veterinarian_id: id(vaccine.veterinarianId),
      name: vaccine.name,
      laboratory: vaccine.laboratory,
      lot: vaccine.lot,
      date_applied: shiftDate(vaccine.dateApplied),
      next_due: shiftDate(vaccine.nextDue),
      notes: vaccine.notes ?? null,
      route: vaccine.route ?? "subcutanea",
      site: vaccine.site ?? null,
      dose_ml: vaccine.doseMl ?? null,
      series_status: vaccine.seriesStatus ?? "activa",
      lot_expiry: null,
      catalog_id: null,
      medical_record_id: null,
    })),
  );

  await save(
    supabase,
    "patient_medications",
    medications.map((medication) => ({
      id: id(medication.id),
      clinic_id: clinicId(),
      patient_id: id(medication.patientId),
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      start_date: shiftDate(medication.startDate),
      end_date: shiftDate(medication.endDate),
      active: medication.active,
    })),
  );

  await save(
    supabase,
    "follow_ups",
    followUps.map((item) => ({
      id: id(item.id),
      clinic_id: clinicId(),
      patient_id: id(item.patientId),
      client_id: id(item.clientId),
      type: item.type,
      title: item.title,
      due_date: shiftDate(item.dueDate),
      status: item.status,
      related_id: item.relatedId ? id(item.relatedId) : null,
      notes: item.notes ?? null,
    })),
  );

  await save(
    supabase,
    "hospitalizations",
    hospitalizations.map((item) => ({
      id: id(item.id),
      clinic_id: clinicId(item.clinicId),
      patient_id: id(item.patientId),
      veterinarian_id: id(item.veterinarianId),
      cage: item.cage,
      reason: item.reason,
      admission_date: shiftDate(item.admissionDate),
      discharge_date: shiftDate(item.dischargeDate),
      status: item.status,
      treatment: item.treatment,
      observations: item.observations ?? null,
    })),
  );

  await save(
    supabase,
    "hospitalization_notes",
    hospitalizations.flatMap((item) =>
      item.notes.map((note) => ({
        id: id(note.id),
        hospitalization_id: id(item.id),
        date: shiftDate(note.date),
        time: note.time,
        note: note.note,
        veterinarian_id: id(note.veterinarianId),
      })),
    ),
  );

  await save(
    supabase,
    "grooming_appointments",
    groomingAppointments.map((item) => ({
      id: id(item.id),
      clinic_id: clinicId(item.clinicId),
      patient_id: id(item.patientId),
      client_id: id(item.clientId),
      service: item.service,
      date: shiftDate(item.date),
      time: item.time,
      professional: item.professional,
      status: item.status,
      appointment_id: item.appointmentId ? id(item.appointmentId) : null,
      sale_id: item.saleId ? id(item.saleId) : null,
      notes: item.notes ?? null,
    })),
  );

  await save(
    supabase,
    "catalog_services",
    clinics.flatMap((clinic) =>
      catalogServices.map((service) => ({
        id: id(`${clinic.id}:${service.id}`),
        clinic_id: id(clinic.id),
        name: service.name,
        category: service.category,
        price: service.price,
        duration_minutes: service.durationMinutes,
      })),
    ),
  );

  await save(
    supabase,
    "activity_events",
    recentActivity.map((item) => ({
      id: id(item.id),
      clinic_id: clinicId(),
      message: item.message,
      occurred_at: shiftDate(item.timestamp),
      type: item.type,
    })),
  );

  console.log(`Semilla lista. Las fechas del ${ANCHOR} quedaron en ${todayISODate()}.`);
  console.log(`Clínica San Miguel: ${id("clinic-1")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
