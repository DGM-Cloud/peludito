import type { Appointment } from "@/types/appointment";
import type { Client, ClientContact, ClientRelationship, ClientStatus, ContactChannel } from "@/types/client";
import type { FollowUp } from "@/types/follow-up";
import type { GroomingAppointment } from "@/types/grooming";
import type { Hospitalization, HospitalizationNote } from "@/types/hospitalization";
import type { MedicalRecord } from "@/types/medical-record";
import type { InventoryBatch, InventoryMovement, Product } from "@/types/product";
import type {
  AdverseReaction,
  AllergySeverity,
  AllergyStatus,
  ChronicCondition,
  HandlingAlert,
  InfoSource,
  Patient,
  PatientAllergy,
  ReproductiveStatus,
  VitalStatus,
  WeightEntry,
} from "@/types/patient";
import type { Sale, SaleItem } from "@/types/sale";
import type { Vaccination, VaccineCatalogItem } from "@/types/vaccination";
import type { Veterinarian } from "@/types/veterinarian";
import type { ActivityItem, Medication } from "@/types/dashboard";
import type { CatalogService } from "@/types/clinic";
import { productStatus, vaccinationStatus } from "@/server/domain";

type Row = Record<string, unknown>;

const text = (value: unknown) => (value == null ? undefined : String(value));

function mapContacts(value: unknown): ClientContact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Row;
    const name = String(row.name ?? "").trim();
    if (!name) return [];
    return [
      {
        id: String(row.id ?? name),
        name,
        phone: String(row.phone ?? ""),
        relationship: (row.relationship as ClientRelationship) || "responsable",
        status: (row.status as ClientStatus) || "activo",
      },
    ];
  });
}

export function mapClient(row: Row, patientIds: string[] = []): Client {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone ?? ""),
    phoneAlt: text(row.phone_alt),
    email: String(row.email ?? ""),
    documentType: (row.document_type as Client["documentType"]) ?? undefined,
    documentNumber: text(row.document_number),
    ruc: text(row.ruc),
    businessName: text(row.business_name),
    birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : undefined,
    address: text(row.address),
    district: text(row.district),
    province: text(row.province),
    department: text(row.department),
    addressReference: text(row.address_reference),
    preferredChannel: (row.preferred_channel as ContactChannel) || undefined,
    allowCall: Boolean(row.allow_call),
    allowWhatsapp: Boolean(row.allow_whatsapp),
    allowEmail: Boolean(row.allow_email),
    relationship: (row.relationship as ClientRelationship) || undefined,
    status: (row.status as ClientStatus) || undefined,
    privacyAcceptedAt: row.privacy_accepted_at ? String(row.privacy_accepted_at) : null,
    notes: text(row.notes),
    contacts: mapContacts(row.authorized_contacts),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    createdByName: text(row.created_by_name),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    updatedByName: text(row.updated_by_name),
    lastVisit: row.last_visit ? String(row.last_visit) : null,
    patientIds,
  };
}

function asList<T>(value: unknown, mapItem: (row: Row) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const mapped = mapItem(item as Row);
    return mapped ? [mapped] : [];
  });
}

export function mapPatient(row: Row): Patient {
  const confirmed = asList(row.confirmed_allergies, (item) => {
    const substance = String(item.substance ?? "").trim();
    if (!substance) return null;
    return {
      id: String(item.id ?? substance),
      substance,
      reaction: String(item.reaction ?? ""),
      severity: (item.severity as AllergySeverity) || "",
      status: (item.status as AllergyStatus) === "sospechada" ? "sospechada" : "confirmada",
    } satisfies PatientAllergy;
  });
  const legacyAllergies = ((row.allergies as string[]) ?? []).filter(Boolean);
  return {
    id: String(row.id),
    code: text(row.code),
    name: String(row.name),
    altName: text(row.alt_name),
    species: row.species as Patient["species"],
    breed: String(row.breed ?? ""),
    sex: row.sex as Patient["sex"],
    coat: text(row.coat),
    birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : "",
    birthIsEstimated: Boolean(row.birth_is_estimated),
    ageYears: row.age_years == null ? null : Number(row.age_years),
    ageMonths: row.age_months == null ? null : Number(row.age_months),
    weight: Number(row.weight ?? 0),
    weights: asList(row.weight_history, (item) => {
      const kg = Number(item.kg);
      if (!Number.isFinite(kg) || kg <= 0) return null;
      return {
        id: String(item.id ?? item.measuredAt ?? kg),
        kg,
        measuredAt: String(item.measuredAt ?? item.measured_at ?? ""),
        recordedByName: String(item.recordedByName ?? item.recorded_by_name ?? ""),
      } satisfies WeightEntry;
    }),
    microchip: row.microchip ? String(row.microchip) : null,
    microchipImplantedOn: row.microchip_implanted_on
      ? String(row.microchip_implanted_on).slice(0, 10)
      : undefined,
    microchipPlace: text(row.microchip_place),
    reproductiveStatus: (row.reproductive_status as ReproductiveStatus) || undefined,
    sterilizedOn: row.sterilized_on ? String(row.sterilized_on).slice(0, 10) : undefined,
    sterilizationProcedure: text(row.sterilization_procedure),
    allergies: confirmed.length
      ? confirmed.filter((item) => item.status === "confirmada").map((item) => item.substance)
      : legacyAllergies,
    confirmedAllergies: confirmed,
    adverseReactions: asList(row.adverse_reactions, (item) => {
      const product = String(item.product ?? "").trim();
      if (!product) return null;
      return {
        id: String(item.id ?? product),
        product,
        reaction: String(item.reaction ?? ""),
        severity: (item.severity as AllergySeverity) || "",
      } satisfies AdverseReaction;
    }),
    chronicConditions: asList(row.chronic_conditions, (item) => {
      const name = String(item.name ?? "").trim();
      if (!name) return null;
      return {
        id: String(item.id ?? name),
        name,
        notes: String(item.notes ?? ""),
      } satisfies ChronicCondition;
    }),
    handlingAlerts: Array.isArray(row.handling_alerts)
      ? row.handling_alerts.flatMap((item) => {
          const value = String(item);
          if (
            value === "miedo" ||
            value === "agresividad" ||
            value === "contacto" ||
            value === "manipulacion"
          ) {
            return [value as HandlingAlert];
          }
          return [];
        })
      : [],
    safetyNotes: text(row.safety_notes),
    infoSource: (row.info_source as InfoSource) || "",
    clientId: String(row.client_id),
    status: row.status as Patient["status"],
    vitalStatus: (row.vital_status as VitalStatus) || "vivo",
    deceasedOn: row.deceased_on ? String(row.deceased_on).slice(0, 10) : undefined,
    lastVisit: row.last_visit ? String(row.last_visit) : null,
    photoUrl: text(row.photo_url),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    createdByName: text(row.created_by_name),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    updatedByName: text(row.updated_by_name),
  };
}

export function mapVet(row: Row): Veterinarian {
  return {
    id: String(row.id),
    name: String(row.name),
    specialty: String(row.specialty ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    initials: String(row.initials ?? ""),
    userId: row.user_id ? String(row.user_id) : null,
  };
}

export function mapAppointment(row: Row): Appointment {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    clientId: String(row.client_id),
    veterinarianId: String(row.veterinarian_id),
    clinicId: String(row.clinic_id),
    date: String(row.date).slice(0, 10),
    time: String(row.time).slice(0, 5),
    reason: String(row.reason),
    serviceType: row.service_type as Appointment["serviceType"],
    durationMinutes: Number(row.duration_minutes ?? 30),
    estimatedPrice: Number(row.estimated_price ?? 0),
    channel: (row.channel as Appointment["channel"]) || "presencial",
    remindClient: Boolean(row.remind_client),
    publicToken: text(row.public_token),
    clientReply: (row.client_reply as Appointment["clientReply"]) || undefined,
    notes: text(row.notes),
    status: row.status as Appointment["status"],
    statusBefore: (row.status_before as Appointment["statusBefore"]) ?? undefined,
    medicalRecordId: text(row.medical_record_id),
    saleId: text(row.sale_id),
  };
}

export function mapRecord(row: Row): MedicalRecord {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    veterinarianId: String(row.veterinarian_id),
    date: String(row.date),
    reason: String(row.reason),
    symptoms: String(row.symptoms ?? ""),
    diagnosis: String(row.diagnosis ?? ""),
    treatment: String(row.treatment ?? ""),
    medications: (row.medications as string[]) ?? [],
    observations: text(row.observations),
    status: row.status as MedicalRecord["status"],
  };
}

export function mapVaccineCatalog(row: Row): VaccineCatalogItem {
  const species = Array.isArray(row.species) ? (row.species as string[]) : [];
  return {
    id: String(row.id),
    name: String(row.name),
    species: species.filter(Boolean) as VaccineCatalogItem["species"],
    defaultIntervalDays: Number(row.default_interval_days ?? 365),
    laboratoryHint: String(row.laboratory_hint ?? ""),
    active: row.active !== false,
  };
}

export function mapVaccination(row: Row): Vaccination {
  const nextDue = String(row.next_due);
  const seriesStatus =
    row.series_status === "completada" ? "completada" : "activa";
  const routeRaw = String(row.route ?? "subcutanea");
  const routes = ["subcutanea", "intramuscular", "oral", "nasal", "otra"] as const;
  const route = routes.includes(routeRaw as (typeof routes)[number])
    ? (routeRaw as Vaccination["route"])
    : "subcutanea";
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    name: String(row.name),
    laboratory: String(row.laboratory ?? ""),
    lot: String(row.lot ?? ""),
    dateApplied: String(row.date_applied).slice(0, 10),
    nextDue: nextDue.slice(0, 10),
    veterinarianId: String(row.veterinarian_id),
    status: vaccinationStatus(nextDue, undefined, seriesStatus),
    notes: text(row.notes),
    catalogId: row.catalog_id ? String(row.catalog_id) : null,
    lotExpiry: row.lot_expiry ? String(row.lot_expiry).slice(0, 10) : null,
    route,
    site: text(row.site),
    doseMl: row.dose_ml != null && row.dose_ml !== "" ? Number(row.dose_ml) : null,
    seriesStatus,
    medicalRecordId: row.medical_record_id ? String(row.medical_record_id) : null,
  };
}

export function mapMedication(row: Row): Medication {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    name: String(row.name),
    dosage: String(row.dosage ?? ""),
    frequency: String(row.frequency ?? ""),
    startDate: String(row.start_date),
    endDate: text(row.end_date),
    active: Boolean(row.active),
  };
}

export function mapFollowUp(row: Row): FollowUp {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    clientId: String(row.client_id),
    type: row.type as FollowUp["type"],
    title: String(row.title),
    dueDate: String(row.due_date),
    status: row.status as FollowUp["status"],
    relatedId: text(row.related_id),
    notes: text(row.notes),
  };
}

export function mapNote(row: Row): HospitalizationNote {
  return {
    id: String(row.id),
    date: String(row.date),
    time: String(row.time),
    note: String(row.note),
    veterinarianId: String(row.veterinarian_id),
  };
}

export function mapHospitalization(row: Row): Hospitalization {
  const notes = Array.isArray(row.hospitalization_notes)
    ? (row.hospitalization_notes as Row[]).map(mapNote)
    : [];
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    clinicId: String(row.clinic_id),
    cage: String(row.cage),
    reason: String(row.reason),
    veterinarianId: String(row.veterinarian_id),
    admissionDate: String(row.admission_date),
    status: row.status as Hospitalization["status"],
    treatment: String(row.treatment ?? ""),
    observations: text(row.observations),
    notes,
    dischargeDate: text(row.discharge_date),
  };
}

export function mapProduct(row: Row): Product {
  const stock = Number(row.stock ?? 0);
  const minStock = Number(row.min_stock ?? 0);
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as Product["category"],
    stock,
    minStock,
    price: Number(row.price ?? 0),
    unit: String(row.unit ?? "unidad"),
    status: productStatus(stock, minStock),
    presentation: text(row.presentation),
    provider: text(row.provider),
  };
}

export function mapBatch(row: Row): InventoryBatch {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    lot: String(row.lot),
    expiryDate: String(row.expiry_date),
    quantity: Number(row.quantity ?? 0),
    provider: String(row.provider ?? ""),
    receivedAt: String(row.received_at),
  };
}

export function mapMovement(row: Row): InventoryMovement {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    type: row.type as InventoryMovement["type"],
    quantity: Number(row.quantity ?? 0),
    reason: String(row.reason),
    date: String(row.date),
    saleId: text(row.sale_id),
  };
}

export function mapSale(row: Row): Sale {
  const items = Array.isArray(row.sale_items)
    ? (row.sale_items as Row[]).map(
        (item): SaleItem => ({
          id: String(item.id),
          type: item.type as SaleItem["type"],
          referenceId: String(item.reference_id),
          name: String(item.name),
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unit_price ?? 0),
          total: Number(item.total ?? 0),
        }),
      )
    : [];
  return {
    id: String(row.id),
    date: String(row.date),
    time: String(row.time),
    clientId: String(row.client_id),
    patientId: text(row.patient_id),
    clinicId: String(row.clinic_id),
    items,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: row.payment_method as Sale["paymentMethod"],
    voucherType: row.voucher_type as Sale["voucherType"],
    voucherNumber: text(row.voucher_number),
    documentNumber: text(row.document_number),
    businessName: text(row.business_name),
    notes: text(row.notes),
    appointmentId: text(row.appointment_id),
  };
}

export function mapGrooming(row: Row): GroomingAppointment {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    clientId: String(row.client_id),
    clinicId: String(row.clinic_id),
    service: row.service as GroomingAppointment["service"],
    date: String(row.date),
    time: String(row.time),
    professional: String(row.professional),
    status: row.status as GroomingAppointment["status"],
    appointmentId: text(row.appointment_id),
    saleId: text(row.sale_id),
    notes: text(row.notes),
  };
}

export function mapCatalog(row: Row): CatalogService {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    price: Number(row.price ?? 0),
    durationMinutes: Number(row.duration_minutes ?? 0),
  };
}

export function mapActivity(row: Row): ActivityItem {
  return {
    id: String(row.id),
    message: String(row.message),
    timestamp: String(row.occurred_at),
    type: row.type as ActivityItem["type"],
  };
}
