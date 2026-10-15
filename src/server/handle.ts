import { randomBytes, randomUUID } from "node:crypto";
import type { AppointmentChannel, AppointmentStatus } from "@/types/appointment";
import type { CreateClientInput } from "@/types/client";
import type { DemoRole } from "@/types/clinic";
import type { CreatePatientInput, HandlingAlert, Species } from "@/types/patient";
import type { CreateSaleInput } from "@/types/sale";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireScope, type RequestScope } from "@/server/context";
import {
  BUSY_STATUSES,
  addDaysISO,
  canMoveForward,
  correctionTarget,
  productStatus,
  rangesOverlap,
  todayISODate,
  toMinutes,
} from "@/server/domain";
import { HttpError, one, rows } from "@/server/errors";
import {
  birthDateError,
  clientMatchesQuery,
  documentError,
  emailError,
  rucError,
  normalizeDocument,
  phoneDigits,
  phoneError,
  sameDocument,
  samePhone,
} from "@/utils/client-fields";
import {
  birthDateError as patientBirthDateError,
  microchipError,
  normalizeMicrochip,
  patientCodeFromId,
  samePetName,
  speciesValues,
  weightProblem,
} from "@/utils/patient-fields";
import { isPastAppointment } from "@/utils/formatDate";
import {
  mapActivity,
  mapAppointment,
  mapBatch,
  mapCatalog,
  mapClient,
  mapFollowUp,
  mapGrooming,
  mapHospitalization,
  mapMedication,
  mapMovement,
  mapPatient,
  mapProduct,
  mapRecord,
  mapSale,
  mapVaccination,
  mapVaccineCatalog,
  mapVet,
} from "@/server/map";

type Params = URLSearchParams;

async function patientIdsByClient(scope: RequestScope) {
  const pets = await rows(
    scope.supabase
      .from("patients")
      .select("id, client_id")
      .eq("clinic_id", scope.clinicId),
  );
  const grouped = new Map<string, string[]>();
  for (const pet of pets) {
    const list = grouped.get(String(pet.client_id)) ?? [];
    list.push(String(pet.id));
    grouped.set(String(pet.client_id), list);
  }
  return grouped;
}

async function listClients(scope: RequestScope) {
  const [data, ids] = await Promise.all([
    rows(
      scope.supabase
        .from("clients")
        .select("*")
        .eq("clinic_id", scope.clinicId)
        .order("name"),
    ),
    patientIdsByClient(scope),
  ]);
  return data.map((row) => mapClient(row, ids.get(String(row.id)) ?? []));
}

async function listPatients(scope: RequestScope, params: Params) {
  let query = scope.supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", scope.clinicId)
    .order("name");
  const clientId = params.get("clientId");
  if (clientId) query = query.eq("client_id", clientId);
  return (await rows(query)).map(mapPatient);
}

async function listAppointments(scope: RequestScope, params: Params) {
  let query = scope.supabase
    .from("appointments")
    .select("*")
    .eq("clinic_id", scope.clinicId)
    .order("date")
    .order("time");
  const date = params.get("date");
  const patientId = params.get("patientId");
  const veterinarianId = params.get("veterinarianId");
  if (date) query = query.eq("date", date);
  if (patientId) query = query.eq("patient_id", patientId);
  if (veterinarianId) query = query.eq("veterinarian_id", veterinarianId);
  return (await rows(query)).map(mapAppointment);
}

async function slotTaken(
  scope: RequestScope,
  veterinarianId: string,
  date: string,
  time: string,
  durationMinutes = 30,
  excludeId?: string,
  serviceType?: string,
) {
  let query = scope.supabase
    .from("appointments")
    .select("id, time, duration_minutes, status, service_type")
    .eq("clinic_id", scope.clinicId)
    .eq("veterinarian_id", veterinarianId)
    .eq("date", date)
    .in("status", BUSY_STATUSES);
  if (excludeId) query = query.neq("id", excludeId);
  const found = await rows(query);
  const start = toMinutes(time);
  const incomingGrooming = serviceType === "grooming";
  return found.some(
    (row) =>
      !(incomingGrooming && row.service_type === "grooming") &&
      rangesOverlap(
        start,
        durationMinutes,
        toMinutes(String(row.time ?? "")),
        Number(row.duration_minutes ?? 30),
      ),
  );
}

function appointmentStats(items: ReturnType<typeof mapAppointment>[]) {
  return {
    total: items.length,
    atendidas: items.filter((item) =>
      ["atendida", "pagada"].includes(item.status),
    ).length,
    canceladas: items.filter((item) => item.status === "cancelada").length,
    noAsistieron: items.filter((item) => item.status === "no_asistio").length,
    pendientes: items.filter((item) =>
      ["programada", "confirmada", "llego", "en_consulta"].includes(item.status),
    ).length,
    esperando: items.filter((item) => item.status === "llego").length,
    noConfirmadas: items.filter((item) => item.status === "programada").length,
  };
}

async function buildReports(scope: RequestScope, date: string) {
  const [appointments, sales, products, batches, vaccinations, followUps, hospitalizations, activity] =
    await Promise.all([
      listAppointments(scope, new URLSearchParams()),
      rows(
        scope.supabase
          .from("sales")
          .select("*, sale_items(*)")
          .eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapSale)),
      rows(
        scope.supabase.from("products").select("*").eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapProduct)),
      rows(
        scope.supabase
          .from("inventory_batches")
          .select("*")
          .eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapBatch)),
      rows(
        scope.supabase
          .from("vaccinations")
          .select("*")
          .eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapVaccination)),
      rows(
        scope.supabase.from("follow_ups").select("*").eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapFollowUp)),
      rows(
        scope.supabase
          .from("hospitalizations")
          .select("*, hospitalization_notes(*)")
          .eq("clinic_id", scope.clinicId),
      ).then((data) => data.map(mapHospitalization)),
      rows(
        scope.supabase
          .from("activity_events")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .order("occurred_at", { ascending: false })
          .limit(8),
      ).then((data) => data.map(mapActivity)),
    ]);

  const day = appointments.filter((item) => item.date === date);
  const stats = appointmentStats(day);
  const daySales = sales.filter((sale) => sale.date === date);
  const sumMethod = (method: string) =>
    daySales
      .filter((sale) => sale.paymentMethod === method)
      .reduce((total, sale) => total + sale.total, 0);

  const today = new Date(`${date}T12:00:00`);
  const expiring = batches.filter((batch) => {
    const diff =
      (new Date(`${batch.expiryDate}T12:00:00`).getTime() - today.getTime()) /
      86400000;
    return diff >= 0 && diff <= 15;
  }).length;

  const alerts = [];
  const pendingVaccines = vaccinations.filter(
    (item) => item.status === "proxima" || item.status === "vencida",
  ).length;
  const lowStock = products.filter((item) => item.status !== "normal").length;
  const pendingPay = day.filter((item) => item.status === "atendida").length;
  const hospitalized = hospitalizations.filter((item) => item.status !== "alta").length;
  const pendingFollowUps = followUps.filter((item) => item.status === "pendiente").length;

  if (pendingVaccines) {
    alerts.push({
      id: "alert-vac",
      type: "vaccine",
      message: `${pendingVaccines} vacunas requieren seguimiento`,
      severity: "warning",
      href: "/vaccines",
      actionLabel: "Ver vacunas",
    });
  }
  if (lowStock) {
    alerts.push({
      id: "alert-stock",
      type: "stock",
      message: `${lowStock} productos con stock bajo o crítico`,
      severity: "warning",
      href: "/inventory",
      actionLabel: "Ver inventario",
    });
  }
  if (stats.noConfirmadas) {
    alerts.push({
      id: "alert-apt",
      type: "appointment",
      message: `${stats.noConfirmadas} citas aún no fueron confirmadas`,
      severity: "info",
      href: "/appointments",
      actionLabel: "Revisar agenda",
    });
  }
  const cannotAttend = appointments.filter(
    (item) => item.clientReply === "no_puede" && item.date >= date,
  ).length;
  if (cannotAttend) {
    alerts.push({
      id: "alert-reply",
      type: "appointment",
      message:
        cannotAttend === 1
          ? "1 cliente avisó que no puede asistir"
          : `${cannotAttend} clientes avisaron que no pueden asistir`,
      severity: "warning",
      href: "/follow-ups",
      actionLabel: "Ver avisos",
    });
  }
  if (pendingPay) {
    alerts.push({
      id: "alert-pay",
      type: "payment",
      message: `${pendingPay} pago pendiente`,
      severity: "warning",
      href: "/pos",
      actionLabel: "Ir a caja",
    });
  }
  if (hospitalized) {
    alerts.push({
      id: "alert-hosp",
      type: "hospitalization",
      message: `${hospitalized} paciente hospitalizado`,
      severity: "critical",
      href: "/hospitalization",
      actionLabel: "Ver hospitalización",
    });
  }
  if (expiring) {
    alerts.push({
      id: "alert-exp",
      type: "expiry",
      message: `${expiring} lotes vencen pronto`,
      severity: "warning",
      href: "/inventory",
      actionLabel: "Ver vencimientos",
    });
  }
  if (pendingFollowUps) {
    alerts.push({
      id: "alert-fu",
      type: "appointment",
      message: `${pendingFollowUps} seguimientos pendientes`,
      severity: "info",
      href: "/follow-ups",
      actionLabel: "Ver seguimientos",
    });
  }

  const consultations = Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - (6 - index));
    const iso = todayISODate(dayDate);
    const label = dayDate.toLocaleDateString("es-PE", { weekday: "short" });
    return {
      date: iso,
      label: label.replace(".", ""),
      count: appointments.filter(
        (item) =>
          item.date === iso && ["atendida", "pagada"].includes(item.status),
      ).length,
    };
  });

  const monthly = new Map<string, number>();
  for (const sale of sales) {
    const month = new Date(`${sale.date}T12:00:00`).toLocaleDateString("es-PE", {
      month: "short",
    });
    monthly.set(month, (monthly.get(month) ?? 0) + sale.total);
  }

  const serviceCounts = new Map<string, number>();
  for (const appointment of appointments) {
    serviceCounts.set(
      appointment.serviceType,
      (serviceCounts.get(appointment.serviceType) ?? 0) + 1,
    );
  }

  const productCounts = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.type !== "producto") continue;
      productCounts.set(item.name, (productCounts.get(item.name) ?? 0) + item.quantity);
    }
  }

  return {
    kpis: {
      appointmentsToday: stats.total,
      waiting: stats.esperando,
      attended: stats.atendidas,
      incomeToday: daySales.reduce((total, sale) => total + sale.total, 0),
      pendingPayments: pendingPay,
      hospitalized,
    },
    cash: {
      efectivo: sumMethod("efectivo"),
      yape: sumMethod("yape"),
      plin: sumMethod("plin"),
      tarjeta: sumMethod("tarjeta"),
      total: daySales.reduce((total, sale) => total + sale.total, 0),
      count: daySales.length,
    },
    noShow: {
      total: appointments.length,
      noShows: appointments.filter((item) => item.status === "no_asistio").length,
      canceladas: appointments.filter((item) => item.status === "cancelada").length,
    },
    consultations,
    monthlySales: [...monthly.entries()].map(([month, total]) => ({ month, total })),
    topServices: [...serviceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topProducts: [...productCounts.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    activity,
    alerts,
    stats,
  };
}

async function logActivity(
  scope: RequestScope,
  message: string,
  type: string,
) {
  await scope.supabase.from("activity_events").insert({
    clinic_id: scope.clinicId,
    message,
    occurred_at: new Date().toISOString(),
    type,
  });
}

export async function handleGet(resource: string, params: Params) {
  const scope = await requireScope();

  if (resource === "me") {
    return {
      id: scope.userId,
      fullName: scope.fullName,
      email: scope.email,
      role: scope.role,
      clinic: scope.clinic,
      veterinarianId: scope.veterinarianId,
    };
  }
  if (resource === "team") {
    if (scope.role !== "administrador") {
      throw new HttpError("Solo un administrador puede ver el equipo.", 403);
    }
    return listTeam(scope);
  }
  if (resource === "clients") return listClients(scope);
  if (resource === "patients") return listPatients(scope, params);
  if (resource === "veterinarians") {
    return (
      await rows(
        scope.supabase
          .from("veterinarians")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .order("name"),
      )
    ).map(mapVet);
  }
  if (resource === "appointments") return listAppointments(scope, params);
  if (resource === "medical-records") {
    let query = scope.supabase
      .from("medical_records")
      .select("*")
      .eq("clinic_id", scope.clinicId)
      .order("date", { ascending: false });
    if (params.get("patientId")) query = query.eq("patient_id", params.get("patientId")!);
    if (params.get("veterinarianId")) {
      query = query.eq("veterinarian_id", params.get("veterinarianId")!);
    }
    return (await rows(query)).map(mapRecord);
  }
  if (resource === "vaccinations") {
    let query = scope.supabase
      .from("vaccinations")
      .select("*")
      .eq("clinic_id", scope.clinicId)
      .order("date_applied", { ascending: false });
    if (params.get("patientId")) query = query.eq("patient_id", params.get("patientId")!);
    if (params.get("medicalRecordId")) {
      query = query.eq("medical_record_id", params.get("medicalRecordId")!);
    }
    return (await rows(query)).map(mapVaccination);
  }
  if (resource === "vaccine-catalog") {
    let query = scope.supabase
      .from("vaccine_catalog")
      .select("*")
      .eq("clinic_id", scope.clinicId)
      .order("name");
    if (params.get("active") !== "0") query = query.eq("active", true);
    return (await rows(query)).map(mapVaccineCatalog);
  }
  if (resource === "medications") {
    let query = scope.supabase
      .from("patient_medications")
      .select("*")
      .eq("clinic_id", scope.clinicId);
    if (params.get("patientId")) query = query.eq("patient_id", params.get("patientId")!);
    return (await rows(query)).map(mapMedication);
  }
  if (resource === "follow-ups") {
    const data = (
      await rows(
        scope.supabase
          .from("follow_ups")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .order("due_date"),
      )
    ).map(mapFollowUp);
    return params.get("pending") === "1"
      ? data.filter((item) => item.status === "pendiente")
      : data;
  }
  if (resource === "hospitalizations") {
    const data = (
      await rows(
        scope.supabase
          .from("hospitalizations")
          .select("*, hospitalization_notes(*)")
          .eq("clinic_id", scope.clinicId),
      )
    ).map(mapHospitalization);
    return params.get("active") === "1"
      ? data.filter((item) => item.status !== "alta")
      : data;
  }
  if (resource === "grooming") {
    let query = scope.supabase
      .from("grooming_appointments")
      .select("*")
      .eq("clinic_id", scope.clinicId)
      .order("date")
      .order("time");
    if (params.get("date")) query = query.eq("date", params.get("date")!);
    return (await rows(query)).map(mapGrooming);
  }
  if (resource === "products") {
    return (
      await rows(
        scope.supabase.from("products").select("*").eq("clinic_id", scope.clinicId).order("name"),
      )
    ).map(mapProduct);
  }
  if (resource === "batches") {
    let query = scope.supabase
      .from("inventory_batches")
      .select("*")
      .eq("clinic_id", scope.clinicId);
    if (params.get("productId")) query = query.eq("product_id", params.get("productId")!);
    return (await rows(query)).map(mapBatch);
  }
  if (resource === "movements") {
    return (
      await rows(
        scope.supabase
          .from("inventory_movements")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .order("date", { ascending: false }),
      )
    ).map(mapMovement);
  }
  if (resource === "sales") {
    let query = scope.supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("clinic_id", scope.clinicId)
      .order("date", { ascending: false });
    if (params.get("date")) query = query.eq("date", params.get("date")!);
    if (params.get("clientId")) query = query.eq("client_id", params.get("clientId")!);
    return (await rows(query)).map(mapSale);
  }
  if (resource === "catalog") {
    return (
      await rows(
        scope.supabase
          .from("catalog_services")
          .select("*")
          .eq("clinic_id", scope.clinicId),
      )
    ).map(mapCatalog);
  }
  if (resource === "reports") {
    return buildReports(scope, params.get("date") ?? todayISODate());
  }
  if (resource === "search") {
    const q = (params.get("q") ?? "").trim().toLowerCase();
    if (q.length < 2) return { patients: [], clients: [], appointments: [] };
    const [patients, clients, appointments] = await Promise.all([
      listPatients(scope, new URLSearchParams()),
      listClients(scope),
      listAppointments(scope, new URLSearchParams()),
    ]);
    return {
      patients: patients
        .filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.breed.toLowerCase().includes(q),
        )
        .slice(0, 5),
      clients: clients.filter((item) => clientMatchesQuery(item, q)).slice(0, 5),
      appointments: appointments
        .filter((item) => {
          const patient = patients.find((pet) => pet.id === item.patientId);
          const client = clients.find((person) => person.id === item.clientId);
          return (
            patient?.name.toLowerCase().includes(q) ||
            client?.name.toLowerCase().includes(q) ||
            item.reason.toLowerCase().includes(q)
          );
        })
        .slice(0, 5),
    };
  }

  throw new HttpError("Recurso no encontrado", 404);
}

export async function handleGetById(resource: string, id: string, params: Params) {
  const scope = await requireScope();

  if (resource === "clients" && id === "search") {
    const q = (params.get("q") ?? "").trim().toLowerCase();
    if (q.length < 2) return [];
    return (await listClients(scope)).filter((client) => clientMatchesQuery(client, q));
  }

  if (resource === "clients" && id === "lookup") {
    const digits = (params.get("document") ?? "").replace(/\D/g, "");
    if (!digits) return null;
    const match = (await listClients(scope)).find(
      (client) => (client.documentNumber ?? "").replace(/\D/g, "") === digits,
    );
    return match ?? null;
  }

  if (resource === "clients" && id === "duplicates") {
    const phones = [params.get("phone") ?? "", params.get("phoneAlt") ?? ""];
    const document = params.get("document") ?? "";
    const ruc = (params.get("ruc") ?? "").replace(/\D/g, "");
    return (await listClients(scope)).filter((client) => {
      const phoneMatch = phones.some(
        (phone) => samePhone(phone, client.phone) || samePhone(phone, client.phoneAlt),
      );
      const documentMatch = sameDocument(document, client.documentNumber);
      const rucMatch = ruc.length === 11 && client.ruc === ruc;
      return phoneMatch || documentMatch || rucMatch;
    });
  }

  if (resource === "appointments" && id === "slot") {
    return {
      taken: await slotTaken(
        scope,
        params.get("veterinarianId") ?? "",
        params.get("date") ?? "",
        params.get("time") ?? "",
        Number(params.get("duration") ?? 30),
        params.get("excludeId") ?? undefined,
      ),
    };
  }

  if (resource === "appointments" && id === "stats") {
    const date = params.get("date") ?? todayISODate();
    const items = await listAppointments(scope, new URLSearchParams({ date }));
    return appointmentStats(items);
  }

  if (resource === "clients") {
    const client = (await listClients(scope)).find((item) => item.id === id);
    if (!client) throw new HttpError("Cliente no encontrado", 404);
    return client;
  }
  if (resource === "patients" && id === "duplicates") {
    const chip = normalizeMicrochip(params.get("microchip") ?? "");
    const name = params.get("name") ?? "";
    const species = params.get("species") ?? "";
    const clientId = params.get("clientId") ?? "";
    return (await listPatients(scope, new URLSearchParams())).filter((patient) => {
      const chipMatch = chip.length === 15 && normalizeMicrochip(patient.microchip) === chip;
      const nameMatch =
        Boolean(clientId) &&
        patient.clientId === clientId &&
        patient.species === species &&
        samePetName(patient.name, name);
      return chipMatch || nameMatch;
    });
  }

  if (resource === "patients") {
    return mapPatient(
      await one(
        scope.supabase
          .from("patients")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .eq("id", id)
          .maybeSingle(),
        "Paciente no encontrado",
      ),
    );
  }
  if (resource === "appointments") {
    return mapAppointment(
      await one(
        scope.supabase
          .from("appointments")
          .select("*")
          .eq("clinic_id", scope.clinicId)
          .eq("id", id)
          .maybeSingle(),
        "Cita no encontrada",
      ),
    );
  }

  throw new HttpError("Recurso no encontrado", 404);
}

function blank(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function omitColumns(row: Record<string, unknown>, keys: string[]) {
  const next = { ...row };
  for (const key of keys) delete next[key];
  return next;
}

async function createClientRecord(scope: RequestScope, input: CreateClientInput) {
  const name = input.name?.trim() ?? "";
  if (name.length < 2) throw new HttpError("Escribe el nombre completo.");
  const docMessage = documentError(input.documentType ?? "", input.documentNumber ?? "");
  if (docMessage) throw new HttpError(docMessage);
  const phoneMessage = phoneError(input.phone ?? "");
  if (phoneMessage) throw new HttpError(phoneMessage);
  const altMessage = phoneError(input.phoneAlt ?? "");
  if (altMessage) throw new HttpError(altMessage);
  const mailMessage = emailError(input.email ?? "");
  if (mailMessage) throw new HttpError(mailMessage);
  const bornMessage = birthDateError(input.birthDate ?? "");
  if (bornMessage) throw new HttpError(bornMessage);
  const billingMessage = rucError(input.ruc ?? "", input.businessName ?? "");
  if (billingMessage) throw new HttpError(billingMessage);

  const documentNumber = normalizeDocument(input.documentNumber);
  const ruc = (input.ruc ?? "").replace(/\D/g, "") || null;
  const businessName = input.businessName?.trim() || null;
  const preferredChannel =
    input.preferredChannel === "llamada" || input.preferredChannel === "correo"
      ? input.preferredChannel
      : "whatsapp";
  const relationship =
    input.relationship === "tutor" || input.relationship === "responsable"
      ? input.relationship
      : "propietario";
  const status = input.status === "inactivo" ? "inactivo" : "activo";
  const contacts = (input.contacts ?? [])
    .map((item) => ({
      id: randomBytes(8).toString("hex"),
      name: item.name.trim(),
      phone: phoneDigits(item.phone),
      relationship:
        item.relationship === "propietario" || item.relationship === "tutor"
          ? item.relationship
          : "responsable",
      status: item.status === "inactivo" ? "inactivo" : "activo",
    }))
    .filter((item) => item.name || item.phone);
  for (const contact of contacts) {
    if (!contact.name || !contact.phone) {
      throw new HttpError("Cada contacto autorizado necesita nombre y teléfono.");
    }
    const contactPhone = phoneError(contact.phone);
    if (contactPhone) throw new HttpError(`${contact.name}: ${contactPhone}`);
  }

  const species = speciesValues;
  const sexes = new Set(["macho", "hembra"]);
  const pets = (input.pets ?? []).filter((pet) => pet.name?.trim());
  for (const pet of pets) {
    if (!species.has(pet.species) || !sexes.has(pet.sex)) {
      throw new HttpError(`Revisa la especie y el sexo de ${pet.name.trim()}.`);
    }
    const petBorn = birthDateError(pet.birthDate ?? "");
    if (petBorn) throw new HttpError(`${pet.name.trim()}: ${petBorn}`);
  }

  if (documentNumber) {
    const taken = (await listClients(scope)).find((client) =>
      sameDocument(documentNumber, client.documentNumber),
    );
    if (taken) {
      throw new HttpError(`Ese documento ya está registrado a nombre de ${taken.name}.`, 409);
    }
  }

  if (ruc) {
    const taken = (await listClients(scope)).find((client) => client.ruc === ruc);
    if (taken) {
      throw new HttpError(`Ese RUC ya está registrado a nombre de ${taken.name}.`, 409);
    }
  }

  const row = {
    clinic_id: scope.clinicId,
    name,
    phone: phoneDigits(input.phone ?? ""),
    phone_alt: phoneDigits(input.phoneAlt ?? "") || null,
    email: input.email?.trim() ?? "",
    document_type: input.documentType || null,
    document_number: documentNumber,
    ruc,
    business_name: businessName,
    birth_date: input.birthDate || null,
    address: blank(input.address),
    district: blank(input.district),
    province: blank(input.province),
    department: blank(input.department),
    address_reference: blank(input.addressReference),
    preferred_channel: preferredChannel,
    allow_call: Boolean(input.allowCall),
    allow_whatsapp: Boolean(input.allowWhatsapp),
    allow_email: Boolean(input.allowEmail),
    relationship,
    status,
    privacy_accepted_at: input.privacyAccepted ? new Date().toISOString() : null,
    notes: blank(input.notes),
    authorized_contacts: contacts,
    created_by: scope.userId,
    created_by_name: scope.fullName,
    updated_by: scope.userId,
    updated_by_name: scope.fullName,
    updated_at: new Date().toISOString(),
  };

  let created;
  try {
    created = await one(scope.supabase.from("clients").insert(row).select("*").single());
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const missingRuc = /ruc|business_name/i.test(message);
    if (missingRuc && (ruc || businessName)) {
      throw new HttpError("Falta aplicar la actualización de RUC en la base de datos.");
    }
    if (missingRuc) {
      try {
        created = await one(
          scope.supabase
            .from("clients")
            .insert(omitColumns(row, ["ruc", "business_name"]))
            .select("*")
            .single(),
        );
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : "";
        if (/column|schema cache|authorized_contacts|birth_date/i.test(retryMessage)) {
          throw new HttpError("Falta aplicar la actualización de clientes en la base de datos.");
        }
        throw retryErr;
      }
    } else if (/column|schema cache|authorized_contacts|birth_date/i.test(message)) {
      throw new HttpError("Falta aplicar la actualización de clientes en la base de datos.");
    } else {
      throw err;
    }
  }

  const petIds: string[] = [];
  const warnings: string[] = [];
  for (const pet of pets) {
    try {
      const saved = await one(
        scope.supabase
          .from("patients")
          .insert({
            clinic_id: scope.clinicId,
            client_id: created.id,
            name: pet.name.trim(),
            species: pet.species,
            breed: pet.breed?.trim() ?? "",
            sex: pet.sex,
            birth_date: pet.birthDate || null,
            weight: 0,
            allergies: [],
            status: "activo",
          })
          .select("*")
          .single(),
      );
      petIds.push(String(saved.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar";
      warnings.push(`${pet.name.trim()} no quedó registrada. ${message}`);
    }
  }

  await logActivity(scope, `Cliente registrado: ${name}`, "client");
  return { ...mapClient(created, petIds), warnings };
}

function labeledRows(
  items: unknown,
  fields: string[],
  message: string,
) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const next: Record<string, unknown> = { id: randomBytes(8).toString("hex") };
    for (const field of fields) next[field] = String(row[field] ?? "").trim();
    const primary = String(next[fields[0]] ?? "");
    if (!primary) return [];
    if (fields.some((field) => field !== fields[0] && next[field] === undefined)) {
      throw new HttpError(message);
    }
    if (row.severity) next.severity = row.severity;
    if (row.status === "sospechada" || row.status === "confirmada") next.status = row.status;
    return [next];
  });
}

async function createPatientRecord(scope: RequestScope, input: CreatePatientInput) {
  const name = input.name?.trim() ?? "";
  if (name.length < 2) throw new HttpError("Escribe el nombre de la mascota.");
  if (!speciesValues.has(input.species)) throw new HttpError("Elige la especie.");
  if (input.sex !== "macho" && input.sex !== "hembra") throw new HttpError("Elige el sexo.");
  if (!input.clientId) throw new HttpError("Elige al tutor.");

  const birthMessage = patientBirthDateError(input.birthDate ?? "");
  if (!input.birthIsEstimated && birthMessage) throw new HttpError(birthMessage);
  const ageYears = Number(input.ageYears ?? 0);
  const ageMonths = Number(input.ageMonths ?? 0);
  if (input.birthIsEstimated) {
    if ((!ageYears && !ageMonths) || ageYears < 0 || ageYears > 40 || ageMonths < 0 || ageMonths > 11) {
      throw new HttpError("Revisa la edad aproximada.");
    }
  }

  const chip = normalizeMicrochip(input.microchip);
  const chipMessage = microchipError(input.microchip ?? "");
  if (chipMessage) throw new HttpError(chipMessage);
  if (chip) {
    const taken = (await listPatients(scope, new URLSearchParams())).find(
      (patient) => normalizeMicrochip(patient.microchip) === chip,
    );
    if (taken) {
      throw new HttpError(`Ese microchip ya está asociado a ${taken.name}.`, 409);
    }
  }

  const implantMessage = patientBirthDateError(input.microchipImplantedOn ?? "");
  if (implantMessage) throw new HttpError("La fecha de implantación no puede ser futura.");
  const sterileMessage = patientBirthDateError(input.sterilizedOn ?? "");
  if (sterileMessage) throw new HttpError("La fecha de esterilización no puede ser futura.");

  const reproductive =
    input.reproductiveStatus === "entero" || input.reproductiveStatus === "esterilizado"
      ? input.reproductiveStatus
      : "desconocido";
  if ((input.sterilizedOn || input.sterilizationProcedure) && reproductive !== "esterilizado") {
    throw new HttpError("La fecha de esterilización solo aplica si el estado es esterilizado.");
  }

  const weight = Number(input.weight ?? 0);
  if (input.weight) {
    const weightMessage = weightProblem(input.species, weight, Boolean(input.confirmExtremeWeight));
    if (weightMessage) throw new HttpError(weightMessage);
  }

  const photo = input.photoUrl?.trim() ?? "";
  if (photo.length > 200_000) throw new HttpError("La foto es muy pesada. Prueba con otra.");

  const confirmed = labeledRows(
    input.confirmedAllergies,
    ["substance", "reaction"],
    "Cada alergia necesita la sustancia.",
  ).map((item) => {
    item.status = item.status === "sospechada" ? "sospechada" : "confirmada";
    return item;
  });
  const reactions = labeledRows(input.adverseReactions, ["product", "reaction"], "Cada reacción necesita el producto.");
  const chronic = labeledRows(input.chronicConditions, ["name", "notes"], "Cada condición necesita un nombre.");
  const handling = (input.handlingAlerts ?? []).filter((item): item is HandlingAlert =>
    item === "miedo" || item === "agresividad" || item === "contacto" || item === "manipulacion",
  );
  const confirmedNames = confirmed
    .filter((item) => item.status === "confirmada")
    .map((item) => String(item.substance));

  const patientId = randomUUID();
  const measuredAt = input.measuredAt || new Date().toISOString();
  const weightHistory =
    weight > 0
      ? [
          {
            id: randomBytes(8).toString("hex"),
            kg: weight,
            measuredAt,
            recordedByName: scope.fullName,
          },
        ]
      : [];

  const row: Record<string, unknown> = {
    id: patientId,
    clinic_id: scope.clinicId,
    client_id: input.clientId,
    code: patientCodeFromId(patientId),
    name,
    alt_name: blank(input.altName),
    species: input.species,
    breed: input.breed?.trim() ?? "",
    sex: input.sex,
    coat: blank(input.coat),
    birth_date: input.birthIsEstimated ? null : input.birthDate || null,
    birth_is_estimated: Boolean(input.birthIsEstimated),
    age_years: input.birthIsEstimated ? ageYears : null,
    age_months: input.birthIsEstimated ? ageMonths : null,
    weight: weight > 0 ? weight : 0,
    weight_history: weightHistory,
    microchip: chip || null,
    microchip_implanted_on: input.microchipImplantedOn || null,
    microchip_place: blank(input.microchipPlace),
    reproductive_status: reproductive,
    sterilized_on: reproductive === "esterilizado" ? input.sterilizedOn || null : null,
    sterilization_procedure:
      reproductive === "esterilizado" ? blank(input.sterilizationProcedure) : null,
    allergies: confirmedNames.length ? confirmedNames : input.allergies ?? [],
    confirmed_allergies: confirmed,
    adverse_reactions: reactions,
    chronic_conditions: chronic,
    handling_alerts: handling,
    safety_notes: blank(input.safetyNotes),
    info_source: input.infoSource || null,
    status: input.status === "inactivo" ? "inactivo" : "activo",
    vital_status: "vivo",
    photo_url: photo || null,
    created_by: scope.userId,
    created_by_name: scope.fullName,
    updated_by: scope.userId,
    updated_by_name: scope.fullName,
    updated_at: new Date().toISOString(),
  };

  const legacySpecies = new Set<Species>(["perro", "gato", "ave", "conejo"]);
  const usesNewFields =
    !legacySpecies.has(input.species) ||
    Boolean(
      input.altName ||
        input.coat ||
        input.birthIsEstimated ||
        input.microchipImplantedOn ||
        input.microchipPlace ||
        (reproductive !== "desconocido") ||
        confirmed.length ||
        reactions.length ||
        chronic.length ||
        handling.length ||
        input.safetyNotes ||
        input.infoSource,
    );

  try {
    const created = await one(scope.supabase.from("patients").insert(row).select("*").single());
    await logActivity(scope, `Paciente registrado: ${name}`, "patient");
    return mapPatient(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const missingColumn = /column|schema cache|reproductive_status|weight_history|confirmed_allergies|code/i.test(
      message,
    );
    const oldConstraint = /patients_species_check|birth_date/i.test(message);
    if ((missingColumn || oldConstraint) && usesNewFields) {
      throw new HttpError("Falta aplicar la actualización de pacientes en la base de datos.");
    }
    if (missingColumn || oldConstraint) {
      const created = await one(
        scope.supabase
          .from("patients")
          .insert({
            clinic_id: scope.clinicId,
            client_id: input.clientId,
            name,
            species: input.species,
            breed: input.breed?.trim() ?? "",
            sex: input.sex,
            birth_date: input.birthDate || null,
            weight: weight > 0 ? weight : 0,
            microchip: chip || null,
            allergies: input.allergies ?? confirmedNames,
            status: "activo",
            photo_url: photo || null,
          })
          .select("*")
          .single(),
      );
      await logActivity(scope, `Paciente registrado: ${name}`, "patient");
      return mapPatient(created);
    }
    if (/microchip/i.test(message) && chip) {
      throw new HttpError("Ese microchip ya está asociado a otro paciente.", 409);
    }
    throw err;
  }
}

async function recordPatientWeight(
  scope: RequestScope,
  id: string,
  body: Record<string, unknown>,
) {
  const current = mapPatient(
    await one(
      scope.supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", scope.clinicId)
        .eq("id", id)
        .maybeSingle(),
      "Paciente no encontrado",
    ),
  );
  const kg = Number(body.weight);
  const problem = weightProblem(current.species, kg, true);
  if (problem && /plausible|mayor que cero/i.test(problem)) throw new HttpError(problem);
  const entry = {
    id: randomBytes(8).toString("hex"),
    kg,
    measuredAt: typeof body.measuredAt === "string" && body.measuredAt ? body.measuredAt : new Date().toISOString(),
    recordedByName: scope.fullName,
  };
  const history = [...(current.weights ?? []), entry];
  try {
    const updated = await one(
      scope.supabase
        .from("patients")
        .update({
          weight: kg,
          weight_history: history,
          updated_by: scope.userId,
          updated_by_name: scope.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("clinic_id", scope.clinicId)
        .select("*")
        .maybeSingle(),
      "Paciente no encontrado",
    );
    return mapPatient(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/weight_history|column|schema cache/i.test(message)) {
      const updated = await one(
        scope.supabase
          .from("patients")
          .update({ weight: kg })
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .select("*")
          .maybeSingle(),
        "Paciente no encontrado",
      );
      return mapPatient(updated);
    }
    throw err;
  }
}

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: DemoRole;
  veterinarianId: string | null;
  specialty: string | null;
  phone: string | null;
};

async function listTeam(scope: RequestScope): Promise<TeamMember[]> {
  const profiles = await rows(
    scope.supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("clinic_id", scope.clinicId)
      .order("full_name"),
  );
  const vets = await rows(
    scope.supabase
      .from("veterinarians")
      .select("id, user_id, specialty, phone")
      .eq("clinic_id", scope.clinicId),
  );
  const vetByUser = new Map(
    vets
      .filter((row) => row.user_id)
      .map((row) => [String(row.user_id), row]),
  );
  return profiles.map((row) => {
    const vet = vetByUser.get(String(row.id));
    return {
      id: String(row.id),
      fullName: String(row.full_name),
      email: String(row.email ?? ""),
      role: row.role as DemoRole,
      veterinarianId: vet ? String(vet.id) : null,
      specialty: vet ? String(vet.specialty ?? "") : null,
      phone: vet ? String(vet.phone ?? "") : null,
    };
  });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

async function createTeamMember(
  scope: RequestScope,
  body: Record<string, unknown>,
): Promise<TeamMember> {
  if (scope.role !== "administrador") {
    throw new HttpError("Solo un administrador puede registrar al equipo.", 403);
  }

  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const specialty = String(body.specialty ?? "").trim();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "veterinario") as DemoRole;
  const allowed: DemoRole[] = ["recepcion", "veterinario", "caja", "administrador"];
  if (!allowed.includes(role)) throw new HttpError("Rol no válido.");
  if (fullName.length < 2) throw new HttpError("Indica el nombre completo.");
  if (!email.includes("@")) throw new HttpError("Indica un correo válido.");
  if (password.length < 8) {
    throw new HttpError("La contraseña debe tener al menos 8 caracteres.");
  }
  if (role === "veterinario" && specialty.length < 2) {
    throw new HttpError("Indica la especialidad del veterinario.");
  }

  const admin = createAdminSupabase();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      clinic_id: scope.clinicId,
      role,
    },
  });
  if (createError || !created.user) {
    throw new HttpError(
      createError?.message?.includes("already")
        ? "Ya existe un usuario con ese correo."
        : createError?.message || "No se pudo crear el usuario.",
      400,
    );
  }

  const userId = created.user.id;

  // Asegura rol/clínica por si el trigger no recibió metadata.
  await admin
    .from("profiles")
    .update({
      clinic_id: scope.clinicId,
      role,
      full_name: fullName,
      email,
    })
    .eq("id", userId);

  let veterinarianId: string | null = null;
  if (role === "veterinario") {
    const { data: vet, error: vetError } = await admin
      .from("veterinarians")
      .insert({
        clinic_id: scope.clinicId,
        name: fullName,
        specialty,
        email,
        phone,
        initials: initialsFromName(fullName),
        user_id: userId,
      })
      .select("id")
      .single();
    if (vetError || !vet) {
      throw new HttpError(
        vetError?.message || "Usuario creado, pero no se pudo vincular al veterinario.",
        500,
      );
    }
    veterinarianId = String(vet.id);
  }

  await logActivity(scope, `Equipo: alta de ${fullName} (${role})`, "team");
  return {
    id: userId,
    fullName,
    email,
    role,
    veterinarianId,
    specialty: role === "veterinario" ? specialty : null,
    phone: role === "veterinario" ? phone : phone || null,
  };
}

const VACCINE_ROUTES = ["subcutanea", "intramuscular", "oral", "nasal", "otra"] as const;

function normalizeVaccineRoute(value: unknown) {
  const route = String(value ?? "subcutanea");
  return VACCINE_ROUTES.includes(route as (typeof VACCINE_ROUTES)[number])
    ? route
    : "subcutanea";
}

async function resolveVaccinationMedicalRecord(
  scope: RequestScope,
  body: Record<string, unknown>,
  patientId: string,
) {
  const linkedId = body.medicalRecordId ? String(body.medicalRecordId) : "";
  if (linkedId) {
    const record = await one(
      scope.supabase
        .from("medical_records")
        .select("id, patient_id")
        .eq("id", linkedId)
        .eq("clinic_id", scope.clinicId)
        .maybeSingle(),
      "La consulta indicada no existe.",
    );
    if (String(record.patient_id) !== patientId) {
      throw new HttpError("La consulta no pertenece a este paciente.");
    }
    return linkedId;
  }

  const registerInHistory = body.registerInHistory !== false;
  if (!registerInHistory) return null;

  const name = String(body.name ?? "Vacuna");
  const lot = String(body.lot ?? "");
  const route = normalizeVaccineRoute(body.route);
  const notes = [
    lot ? `Lote ${lot}` : null,
    body.lotExpiry ? `Vence lote ${String(body.lotExpiry).slice(0, 10)}` : null,
    `Vía ${route}`,
    body.site ? `Sitio ${String(body.site)}` : null,
    body.doseMl != null && body.doseMl !== "" ? `Dosis ${body.doseMl} ml` : null,
    body.notes ? String(body.notes) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const created = await one(
    scope.supabase
      .from("medical_records")
      .insert({
        clinic_id: scope.clinicId,
        patient_id: patientId,
        veterinarian_id: body.veterinarianId,
        date: body.dateApplied,
        reason: `Vacunación: ${name}`,
        symptoms: "",
        diagnosis: `Vacuna aplicada: ${name}`,
        treatment: notes || `Aplicación de ${name}`,
        medications: [],
        observations: body.notes ? String(body.notes) : null,
        status: "cerrada",
      })
      .select("id")
      .single(),
  );
  return String(created.id);
}

async function createVaccinationRecord(
  scope: RequestScope,
  body: Record<string, unknown>,
) {
  const patientId = String(body.patientId ?? "");
  const name = String(body.name ?? "").trim();
  const lot = String(body.lot ?? "").trim();
  const dateApplied = String(body.dateApplied ?? "").slice(0, 10);
  let nextDue = String(body.nextDue ?? "").slice(0, 10);
  const veterinarianId = String(body.veterinarianId ?? "");

  if (!patientId) throw new HttpError("Selecciona el paciente.");
  if (name.length < 2) throw new HttpError("Indica el nombre de la vacuna.");
  if (!lot) throw new HttpError("Ingresa el número de lote.");
  if (!dateApplied) throw new HttpError("Indica la fecha de aplicación.");
  if (!veterinarianId) throw new HttpError("Selecciona el veterinario.");

  if (!nextDue && body.catalogId) {
    const catalog = await one(
      scope.supabase
        .from("vaccine_catalog")
        .select("default_interval_days")
        .eq("id", String(body.catalogId))
        .eq("clinic_id", scope.clinicId)
        .maybeSingle(),
      "Vacuna del catálogo no encontrada.",
    );
    nextDue = addDaysISO(dateApplied, Number(catalog.default_interval_days ?? 365));
  }
  if (!nextDue) throw new HttpError("Indica la fecha de la próxima dosis.");

  const medicalRecordId = await resolveVaccinationMedicalRecord(scope, body, patientId);

  const created = await one(
    scope.supabase
      .from("vaccinations")
      .insert({
        clinic_id: scope.clinicId,
        patient_id: patientId,
        veterinarian_id: veterinarianId,
        name,
        laboratory: String(body.laboratory ?? ""),
        lot,
        date_applied: dateApplied,
        next_due: nextDue,
        notes: body.notes ? String(body.notes) : null,
        catalog_id: body.catalogId ? String(body.catalogId) : null,
        lot_expiry: body.lotExpiry ? String(body.lotExpiry).slice(0, 10) : null,
        route: normalizeVaccineRoute(body.route),
        site: body.site ? String(body.site) : null,
        dose_ml:
          body.doseMl != null && body.doseMl !== ""
            ? Number(body.doseMl)
            : null,
        series_status: body.seriesStatus === "completada" ? "completada" : "activa",
        medical_record_id: medicalRecordId,
      })
      .select("*")
      .single(),
  );

  const patient = await one(
    scope.supabase
      .from("patients")
      .select("id, name, client_id")
      .eq("id", patientId)
      .eq("clinic_id", scope.clinicId)
      .maybeSingle(),
    "Paciente no encontrado",
  );

  if (String(created.series_status ?? "activa") !== "completada") {
    await scope.supabase.from("follow_ups").insert({
      clinic_id: scope.clinicId,
      patient_id: patient.id,
      client_id: patient.client_id,
      type: "vacuna",
      title: `Próxima dosis: ${name} — ${patient.name}`,
      due_date: nextDue,
      related_id: created.id,
      status: "pendiente",
    });
  }

  await logActivity(scope, `Vacuna registrada: ${name} (${patient.name})`, "vaccine");
  return mapVaccination(created);
}

export async function handlePost(resource: string, body: Record<string, unknown>) {
  const scope = await requireScope();

  if (resource === "team") {
    return createTeamMember(scope, body);
  }

  if (resource === "clients") {
    return createClientRecord(scope, body as unknown as CreateClientInput);
  }

  if (resource === "patients") {
    return createPatientRecord(scope, body as unknown as CreatePatientInput);
  }

  if (resource === "appointments") {
    const durationMinutes = Math.min(480, Math.max(5, Number(body.durationMinutes) || 30));
    const channels: AppointmentChannel[] = ["presencial", "telefono", "whatsapp"];
    const channel = channels.includes(body.channel as AppointmentChannel)
      ? (body.channel as AppointmentChannel)
      : "presencial";
    if (isPastAppointment(String(body.date), String(body.time))) {
      throw new HttpError("No se puede agendar una cita en un horario que ya pasó.");
    }
    const taken = await slotTaken(
      scope,
      String(body.veterinarianId),
      String(body.date),
      String(body.time),
      durationMinutes,
      undefined,
      String(body.serviceType ?? ""),
    );
    if (taken) {
      throw new HttpError("Ese horario se cruza con otra cita de este veterinario.");
    }
    const created = await one(
      scope.supabase
        .from("appointments")
        .insert({
          clinic_id: scope.clinicId,
          patient_id: body.patientId,
          client_id: body.clientId,
          veterinarian_id: body.veterinarianId,
          date: body.date,
          time: String(body.time).slice(0, 5),
          reason: body.reason,
          service_type: body.serviceType,
          duration_minutes: durationMinutes,
          estimated_price: Math.max(0, Number(body.estimatedPrice) || 0),
          channel,
          remind_client: Boolean(body.remindClient),
          public_token: randomBytes(24).toString("base64url"),
          notes: body.notes ?? null,
          status: body.status ?? "programada",
        })
        .select("*")
        .single(),
    );
    await logActivity(scope, `Cita creada: ${String(body.reason)}`, "appointment");
    return mapAppointment(created);
  }

  if (resource === "medical-records") {
    if (scope.role !== "administrador" && scope.role !== "veterinario") {
      throw new HttpError("No tienes permiso para crear consultas.", 403);
    }
    let veterinarianId = String(body.veterinarianId ?? "");
    if (scope.role === "veterinario") {
      if (!scope.veterinarianId) {
        throw new HttpError(
          "Tu usuario no está vinculado a un veterinario. Pide al administrador que te registre en Equipo.",
          403,
        );
      }
      veterinarianId = scope.veterinarianId;
    }
    if (!veterinarianId) throw new HttpError("Indica el médico tratante.");
    const created = await one(
      scope.supabase
        .from("medical_records")
        .insert({
          clinic_id: scope.clinicId,
          patient_id: body.patientId,
          veterinarian_id: veterinarianId,
          date: body.date,
          reason: body.reason,
          symptoms: body.symptoms ?? "",
          diagnosis: body.diagnosis ?? "",
          treatment: body.treatment ?? "",
          medications: body.medications ?? [],
          observations: body.observations ?? null,
          status: body.status ?? "abierta",
        })
        .select("*")
        .single(),
    );
    return mapRecord(created);
  }

  if (resource === "vaccine-catalog") {
    if (scope.role !== "administrador") {
      throw new HttpError("Solo un administrador puede editar el catálogo de vacunas.", 403);
    }
    const name = String(body.name ?? "").trim();
    if (name.length < 2) throw new HttpError("Indica el nombre de la vacuna.");
    const interval = Number(body.defaultIntervalDays ?? 365);
    if (!Number.isInteger(interval) || interval < 1 || interval > 3650) {
      throw new HttpError("El intervalo debe estar entre 1 y 3650 días.");
    }
    const created = await one(
      scope.supabase
        .from("vaccine_catalog")
        .insert({
          clinic_id: scope.clinicId,
          name,
          species: Array.isArray(body.species) ? body.species : [],
          default_interval_days: interval,
          laboratory_hint: String(body.laboratoryHint ?? ""),
          active: body.active !== false,
        })
        .select("*")
        .single(),
    );
    return mapVaccineCatalog(created);
  }

  if (resource === "vaccinations") {
    return createVaccinationRecord(scope, body);
  }

  if (resource === "follow-ups") {
    const created = await one(
      scope.supabase
        .from("follow_ups")
        .insert({
          clinic_id: scope.clinicId,
          patient_id: body.patientId,
          client_id: body.clientId,
          type: body.type,
          title: body.title,
          due_date: body.dueDate,
          status: body.status ?? "pendiente",
          related_id: body.relatedId ?? null,
          notes: body.notes ?? null,
        })
        .select("*")
        .single(),
    );
    return mapFollowUp(created);
  }

  if (resource === "hospitalizations") {
    const created = await one(
      scope.supabase
        .from("hospitalizations")
        .insert({
          clinic_id: scope.clinicId,
          patient_id: body.patientId,
          veterinarian_id: body.veterinarianId,
          cage: body.cage,
          reason: body.reason,
          admission_date: body.admissionDate,
          status: body.status,
          treatment: body.treatment ?? "",
          observations: body.observations ?? null,
        })
        .select("*, hospitalization_notes(*)")
        .single(),
    );
    return mapHospitalization(created);
  }

  if (resource === "grooming") {
    const created = await one(
      scope.supabase
        .from("grooming_appointments")
        .insert({
          clinic_id: scope.clinicId,
          patient_id: body.patientId,
          client_id: body.clientId,
          service: body.service,
          date: body.date,
          time: body.time,
          professional: body.professional,
          status: body.status ?? "programada",
          notes: body.notes ?? null,
        })
        .select("*")
        .single(),
    );
    return mapGrooming(created);
  }

  if (resource === "products") {
    const stock = Number(body.stock ?? 0);
    const minStock = Number(body.minStock ?? 0);
    const created = await one(
      scope.supabase
        .from("products")
        .insert({
          clinic_id: scope.clinicId,
          name: body.name,
          category: body.category,
          stock,
          min_stock: minStock,
          price: body.price ?? 0,
          unit: body.unit ?? "unidad",
          presentation: body.presentation ?? null,
          provider: body.provider ?? null,
        })
        .select("*")
        .single(),
    );
    return mapProduct(created);
  }

  if (resource === "sales") {
    const input = body as unknown as CreateSaleInput;
    const sameType = await rows(
      scope.supabase
        .from("sales")
        .select("id")
        .eq("clinic_id", scope.clinicId)
        .eq("voucher_type", input.voucherType),
    );
    const seq = sameType.length + 1;
    const voucherNumber =
      input.voucherType === "boleta"
        ? `B001-${String(seq).padStart(8, "0")}`
        : input.voucherType === "factura"
          ? `F001-${String(seq).padStart(8, "0")}`
          : null;
    const sale = await one(
      scope.supabase
        .from("sales")
        .insert({
          clinic_id: scope.clinicId,
          client_id: input.clientId,
          patient_id: input.patientId ?? null,
          date: input.date,
          time: input.time,
          subtotal: input.subtotal,
          discount: input.discount,
          total: input.total,
          payment_method: input.paymentMethod,
          voucher_type: input.voucherType,
          voucher_number: voucherNumber,
          document_number: input.documentNumber ?? null,
          business_name: input.businessName ?? null,
          notes: input.notes ?? null,
          appointment_id: input.appointmentId ?? null,
        })
        .select("*")
        .single(),
    );
    if (input.items.length) {
      const { error } = await scope.supabase.from("sale_items").insert(
        input.items.map((item) => ({
          sale_id: sale.id,
          type: item.type,
          reference_id: item.referenceId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
        })),
      );
      if (error) throw new HttpError(error.message, 500);
    }
    for (const item of input.items) {
      if (item.type !== "producto") continue;
      const product = await one(
        scope.supabase
          .from("products")
          .select("*")
          .eq("id", item.referenceId)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
        "Producto no encontrado",
      );
      const nextStock = Math.max(0, Number(product.stock) - item.quantity);
      await scope.supabase
        .from("products")
        .update({ stock: nextStock })
        .eq("id", product.id);
      await scope.supabase.from("inventory_movements").insert({
        clinic_id: scope.clinicId,
        product_id: product.id,
        type: "salida",
        quantity: item.quantity,
        reason: `Venta ${sale.id}`,
        date: input.date,
        sale_id: sale.id,
      });
      void productStatus(nextStock, Number(product.min_stock));
    }
    await logActivity(scope, `Venta registrada por S/ ${input.total}`, "sale");
    return mapSale(
      await one(
        scope.supabase
          .from("sales")
          .select("*, sale_items(*)")
          .eq("id", sale.id)
          .single(),
      ),
    );
  }

  throw new HttpError("Recurso no encontrado", 404);
}

const clientColumns: Record<string, string> = {
  name: "name",
  phone: "phone",
  phoneAlt: "phone_alt",
  email: "email",
  documentType: "document_type",
  documentNumber: "document_number",
  birthDate: "birth_date",
  address: "address",
  district: "district",
  province: "province",
  department: "department",
  addressReference: "address_reference",
  preferredChannel: "preferred_channel",
  allowCall: "allow_call",
  allowWhatsapp: "allow_whatsapp",
  allowEmail: "allow_email",
  relationship: "relationship",
  status: "status",
  notes: "notes",
  lastVisit: "last_visit",
};

const patientColumns: Record<string, string> = {
  name: "name",
  species: "species",
  breed: "breed",
  sex: "sex",
  birthDate: "birth_date",
  weight: "weight",
  microchip: "microchip",
  allergies: "allergies",
  status: "status",
  lastVisit: "last_visit",
  photoUrl: "photo_url",
  clientId: "client_id",
  vitalStatus: "vital_status",
  deceasedOn: "deceased_on",
};

const appointmentColumns: Record<string, string> = {
  patientId: "patient_id",
  clientId: "client_id",
  veterinarianId: "veterinarian_id",
  date: "date",
  time: "time",
  reason: "reason",
  serviceType: "service_type",
  notes: "notes",
  status: "status",
  statusBefore: "status_before",
  medicalRecordId: "medical_record_id",
  saleId: "sale_id",
};

const recordColumns: Record<string, string> = {
  reason: "reason",
  symptoms: "symptoms",
  diagnosis: "diagnosis",
  treatment: "treatment",
  medications: "medications",
  observations: "observations",
  status: "status",
  date: "date",
  veterinarianId: "veterinarian_id",
};

const followColumns: Record<string, string> = {
  status: "status",
  title: "title",
  dueDate: "due_date",
  notes: "notes",
  type: "type",
};

const vaccinationColumns: Record<string, string> = {
  name: "name",
  laboratory: "laboratory",
  lot: "lot",
  dateApplied: "date_applied",
  nextDue: "next_due",
  veterinarianId: "veterinarian_id",
  notes: "notes",
  catalogId: "catalog_id",
  lotExpiry: "lot_expiry",
  route: "route",
  site: "site",
  doseMl: "dose_ml",
  seriesStatus: "series_status",
  medicalRecordId: "medical_record_id",
};

const productColumns: Record<string, string> = {
  name: "name",
  category: "category",
  stock: "stock",
  minStock: "min_stock",
  price: "price",
  unit: "unit",
  presentation: "presentation",
  provider: "provider",
};

function pick(body: Record<string, unknown>, columns: Record<string, string>) {
  const next: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columns)) {
    if (key in body) next[column] = body[key];
  }
  return next;
}

async function updateClientRecord(
  scope: RequestScope,
  id: string,
  input: CreateClientInput,
) {
  const current = mapClient(
    await one(
      scope.supabase
        .from("clients")
        .select("*")
        .eq("clinic_id", scope.clinicId)
        .eq("id", id)
        .maybeSingle(),
      "Cliente no encontrado",
    ),
  );
  const name = input.name?.trim() ?? "";
  if (name.length < 2) throw new HttpError("Escribe el nombre completo.");
  const docMessage = documentError(input.documentType ?? "", input.documentNumber ?? "");
  if (docMessage) throw new HttpError(docMessage);
  const phoneMessage = phoneError(input.phone ?? "");
  if (phoneMessage) throw new HttpError(phoneMessage);
  const altMessage = phoneError(input.phoneAlt ?? "");
  if (altMessage) throw new HttpError(altMessage);
  const mailMessage = emailError(input.email ?? "");
  if (mailMessage) throw new HttpError(mailMessage);
  const bornMessage = birthDateError(input.birthDate ?? "");
  if (bornMessage) throw new HttpError(bornMessage);
  const billingMessage = rucError(input.ruc ?? "", input.businessName ?? "");
  if (billingMessage) throw new HttpError(billingMessage);

  const documentNumber = normalizeDocument(input.documentNumber);
  const ruc = (input.ruc ?? "").replace(/\D/g, "") || null;
  const businessName = input.businessName?.trim() || null;
  const preferredChannel =
    input.preferredChannel === "llamada" || input.preferredChannel === "correo"
      ? input.preferredChannel
      : "whatsapp";
  const relationship =
    input.relationship === "tutor" || input.relationship === "responsable"
      ? input.relationship
      : "propietario";
  const status = input.status === "inactivo" ? "inactivo" : "activo";
  const contacts = (input.contacts ?? [])
    .map((item) => ({
      id: item.id?.trim() || randomBytes(8).toString("hex"),
      name: item.name.trim(),
      phone: phoneDigits(item.phone),
      relationship:
        item.relationship === "propietario" || item.relationship === "tutor"
          ? item.relationship
          : "responsable",
      status: item.status === "inactivo" ? "inactivo" : "activo",
    }))
    .filter((item) => item.name || item.phone);
  for (const contact of contacts) {
    if (!contact.name || !contact.phone) {
      throw new HttpError("Cada contacto autorizado necesita nombre y teléfono.");
    }
    const contactPhone = phoneError(contact.phone);
    if (contactPhone) throw new HttpError(`${contact.name}: ${contactPhone}`);
  }

  const others = (await listClients(scope)).filter((client) => client.id !== id);
  if (documentNumber) {
    const taken = others.find((client) => sameDocument(documentNumber, client.documentNumber));
    if (taken) {
      throw new HttpError(`Ese documento ya está registrado a nombre de ${taken.name}.`, 409);
    }
  }
  if (ruc) {
    const taken = others.find((client) => client.ruc === ruc);
    if (taken) {
      throw new HttpError(`Ese RUC ya está registrado a nombre de ${taken.name}.`, 409);
    }
  }

  const changes: Record<string, unknown> = {
    name,
    phone: phoneDigits(input.phone ?? ""),
    phone_alt: phoneDigits(input.phoneAlt ?? "") || null,
    email: input.email?.trim() ?? "",
    document_type: input.documentType || null,
    document_number: documentNumber,
    ruc,
    business_name: businessName,
    birth_date: input.birthDate || null,
    address: blank(input.address),
    district: blank(input.district),
    province: blank(input.province),
    department: blank(input.department),
    address_reference: blank(input.addressReference),
    preferred_channel: preferredChannel,
    allow_call: Boolean(input.allowCall),
    allow_whatsapp: Boolean(input.allowWhatsapp),
    allow_email: Boolean(input.allowEmail),
    relationship,
    status,
    notes: blank(input.notes),
    authorized_contacts: contacts,
    updated_by: scope.userId,
    updated_by_name: scope.fullName,
    updated_at: new Date().toISOString(),
  };
  if (input.privacyAccepted && !current.privacyAcceptedAt) {
    changes.privacy_accepted_at = new Date().toISOString();
  }

  try {
    const updated = await one(
      scope.supabase
        .from("clients")
        .update(changes)
        .eq("id", id)
        .eq("clinic_id", scope.clinicId)
        .select("*")
        .maybeSingle(),
      "Cliente no encontrado",
    );
    return mapClient(updated, current.patientIds);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/ruc|business_name/i.test(message)) {
      if (ruc || businessName) {
        throw new HttpError("Falta aplicar la actualización de RUC en la base de datos.");
      }
      const updated = await one(
        scope.supabase
          .from("clients")
          .update(omitColumns(changes, ["ruc", "business_name"]))
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .select("*")
          .maybeSingle(),
        "Cliente no encontrado",
      );
      return mapClient(updated, current.patientIds);
    }
    if (/column|schema cache|authorized_contacts|birth_date/i.test(message)) {
      throw new HttpError("Falta aplicar la actualización de clientes en la base de datos.");
    }
    throw err;
  }
}

export async function handlePatch(
  resource: string,
  id: string,
  body: Record<string, unknown>,
) {
  const scope = await requireScope();
  if (resource === "clients") {
    return updateClientRecord(scope, id, body as unknown as CreateClientInput);
  }
  if (resource === "patients" && body.weight != null && body.weight !== "" && !body.name) {
    return recordPatientWeight(scope, id, body);
  }
  if (resource === "patients") {
    if (body.vitalStatus != null) {
      const vital = body.vitalStatus === "fallecido" || body.vitalStatus === "vivo" ? body.vitalStatus : "";
      if (!vital) throw new HttpError("El estado vital no es válido.");
      const deceasedOn = String(body.deceasedOn ?? "").slice(0, 10);
      if (vital === "fallecido") {
        if (!deceasedOn) throw new HttpError("Indica la fecha de fallecimiento.");
        if (patientBirthDateError(deceasedOn)) {
          throw new HttpError("La fecha de fallecimiento no puede ser futura.");
        }
        body.deceasedOn = deceasedOn;
      } else {
        body.deceasedOn = null;
      }
      body.vitalStatus = vital;
    }
    if (body.status != null && body.status !== "activo" && body.status !== "inactivo") {
      throw new HttpError("El estado administrativo no es válido.");
    }
    if (body.clientId != null) {
      const clientId = String(body.clientId);
      const owner = await one(
        scope.supabase.from("clients").select("id").eq("id", clientId).eq("clinic_id", scope.clinicId).maybeSingle(),
        "Elige un tutor registrado.",
      );
      body.clientId = owner.id;
    }
  }
  if (resource === "medical-records") {
    const existing = await one(
      scope.supabase
        .from("medical_records")
        .select("id, veterinarian_id, status")
        .eq("id", id)
        .eq("clinic_id", scope.clinicId)
        .maybeSingle(),
      "Consulta no encontrada",
    );
    const currentVetId = String(existing.veterinarian_id);
    const transferring = body.veterinarianId != null && String(body.veterinarianId) !== currentVetId;

    if (transferring) {
      if (scope.role !== "administrador" && scope.role !== "recepcion") {
        throw new HttpError("Solo recepción o administración pueden transferir el tratante.", 403);
      }
    } else if (scope.role === "veterinario") {
      if (!scope.veterinarianId || scope.veterinarianId !== currentVetId) {
        throw new HttpError("Solo el médico tratante puede editar esta consulta.", 403);
      }
    } else if (scope.role !== "administrador") {
      throw new HttpError("No tienes permiso para editar esta consulta.", 403);
    }
  }
  const tables: Record<string, { table: string; columns: Record<string, string>; map: (row: Record<string, unknown>) => unknown }> = {
    clients: { table: "clients", columns: clientColumns, map: (row) => mapClient(row) },
    patients: { table: "patients", columns: patientColumns, map: (row) => mapPatient(row) },
    appointments: {
      table: "appointments",
      columns: appointmentColumns,
      map: (row) => mapAppointment(row),
    },
    "medical-records": {
      table: "medical_records",
      columns: recordColumns,
      map: (row) => mapRecord(row),
    },
    vaccinations: {
      table: "vaccinations",
      columns: vaccinationColumns,
      map: (row) => mapVaccination(row),
    },
    "follow-ups": { table: "follow_ups", columns: followColumns, map: (row) => mapFollowUp(row) },
    products: { table: "products", columns: productColumns, map: (row) => mapProduct(row) },
  };
  if (resource === "catalog") {
    if (scope.role !== "administrador") {
      throw new HttpError("Solo un administrador puede editar los servicios.", 403);
    }
    const price = Number(body.price);
    const durationMinutes = Number(body.durationMinutes);
    if (!Number.isFinite(price) || price < 0) throw new HttpError("Precio inválido.");
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      throw new HttpError("La duración debe estar entre 5 y 480 minutos.");
    }
    const updated = await one(
      scope.supabase
        .from("catalog_services")
        .update({ price, duration_minutes: durationMinutes })
        .eq("id", id)
        .eq("clinic_id", scope.clinicId)
        .select("*")
        .maybeSingle(),
      "Servicio no encontrado",
    );
    return mapCatalog(updated);
  }

  const target = tables[resource];
  if (!target) throw new HttpError("Recurso no encontrado", 404);
  const changes = pick(body, target.columns);
  if (resource === "clients") {
    changes.updated_by = scope.userId;
    changes.updated_by_name = scope.fullName;
    changes.updated_at = new Date().toISOString();
  }
  if (resource === "vaccinations" && changes.route != null) {
    changes.route = normalizeVaccineRoute(changes.route);
  }
  try {
    const updated = await one(
      scope.supabase
        .from(target.table)
        .update(changes)
        .eq("id", id)
        .eq("clinic_id", scope.clinicId)
        .select("*")
        .maybeSingle(),
      "No encontrado",
    );
    if (resource === "vaccinations" && changes.series_status === "completada") {
      await scope.supabase
        .from("follow_ups")
        .update({ status: "completado" })
        .eq("clinic_id", scope.clinicId)
        .eq("related_id", id)
        .eq("type", "vacuna")
        .eq("status", "pendiente");
    }
    return target.map(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (resource === "patients" && /vital_status|deceased_on/i.test(message)) {
      throw new HttpError("Falta aplicar la actualización de pacientes en la base de datos.");
    }
    throw err;
  }
}

export async function handleAction(
  resource: string,
  id: string,
  action: string,
  body: Record<string, unknown>,
) {
  const scope = await requireScope();

  if (resource === "appointments" && action === "status") {
    const current = mapAppointment(
      await one(
        scope.supabase
          .from("appointments")
          .select("*")
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
        "Cita no encontrada",
      ),
    );
    const status = body.status as AppointmentStatus;
    if (!canMoveForward(current.status, status)) {
      throw new HttpError("Ese cambio de estado no está permitido.");
    }
    const updated = mapAppointment(
      await one(
        scope.supabase
          .from("appointments")
          .update({ status, status_before: current.status })
          .eq("id", id)
          .select("*")
          .single(),
      ),
    );
    if (status === "no_asistio") {
      await scope.supabase.from("follow_ups").insert({
        clinic_id: scope.clinicId,
        patient_id: updated.patientId,
        client_id: updated.clientId,
        type: "no_show",
        title: "Reprogramar cita no asistida",
        due_date: updated.date,
        related_id: updated.id,
        status: "pendiente",
      });
    }
    return updated;
  }

  if (resource === "appointments" && action === "correct") {
    const current = mapAppointment(
      await one(
        scope.supabase
          .from("appointments")
          .select("*")
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
        "Cita no encontrada",
      ),
    );
    const target = correctionTarget(current);
    if (!target) throw new HttpError("Esta cita no se puede corregir.");
    return mapAppointment(
      await one(
        scope.supabase
          .from("appointments")
          .update({ status: target, status_before: null })
          .eq("id", id)
          .select("*")
          .single(),
      ),
    );
  }

  if (resource === "vaccinations" && action === "booster") {
    const current = mapVaccination(
      await one(
        scope.supabase
          .from("vaccinations")
          .select("*")
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
        "Vacuna no encontrada",
      ),
    );
    const dateApplied = String(body.dateApplied ?? todayISODate()).slice(0, 10);
    let nextDue = body.nextDue ? String(body.nextDue).slice(0, 10) : "";
    if (!nextDue && current.catalogId) {
      const catalog = await one(
        scope.supabase
          .from("vaccine_catalog")
          .select("default_interval_days")
          .eq("id", current.catalogId)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
      );
      nextDue = addDaysISO(
        dateApplied,
        Number(catalog.default_interval_days ?? 365),
      );
    }
    if (!nextDue) {
      const prev = new Date(`${current.dateApplied}T12:00:00`);
      const next = new Date(`${current.nextDue}T12:00:00`);
      const interval = Math.max(
        1,
        Math.round((next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)),
      );
      nextDue = addDaysISO(dateApplied, interval || 365);
    }

    await scope.supabase
      .from("follow_ups")
      .update({ status: "completado" })
      .eq("clinic_id", scope.clinicId)
      .eq("related_id", id)
      .eq("type", "vacuna")
      .eq("status", "pendiente");

    return createVaccinationRecord(scope, {
      patientId: current.patientId,
      name: current.name,
      laboratory: body.laboratory ?? current.laboratory,
      lot: body.lot ?? "",
      dateApplied,
      nextDue,
      veterinarianId: body.veterinarianId ?? current.veterinarianId,
      notes: body.notes ?? current.notes,
      catalogId: current.catalogId,
      lotExpiry: body.lotExpiry ?? null,
      route: body.route ?? current.route,
      site: body.site ?? current.site,
      doseMl: body.doseMl ?? current.doseMl,
      medicalRecordId: body.medicalRecordId ?? null,
      registerInHistory: body.registerInHistory !== false,
    });
  }

  if (resource === "hospitalizations" && action === "notes") {
    const { error } = await scope.supabase.from("hospitalization_notes").insert({
      hospitalization_id: id,
      date: body.date,
      time: body.time,
      note: body.note,
      veterinarian_id: body.veterinarianId,
    });
    if (error) throw new HttpError(error.message, 500);
    return mapHospitalization(
      await one(
        scope.supabase
          .from("hospitalizations")
          .select("*, hospitalization_notes(*)")
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .maybeSingle(),
      ),
    );
  }

  if (resource === "hospitalizations" && action === "status") {
    const status = String(body.status);
    return mapHospitalization(
      await one(
        scope.supabase
          .from("hospitalizations")
          .update({
            status,
            discharge_date: status === "alta" ? todayISODate() : null,
          })
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .select("*, hospitalization_notes(*)")
          .maybeSingle(),
      ),
    );
  }

  if (resource === "grooming" && action === "status") {
    return mapGrooming(
      await one(
        scope.supabase
          .from("grooming_appointments")
          .update({ status: body.status })
          .eq("id", id)
          .eq("clinic_id", scope.clinicId)
          .select("*")
          .maybeSingle(),
      ),
    );
  }

  throw new HttpError("Acción no encontrada", 404);
}
