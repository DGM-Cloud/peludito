import type {
  Client,
  ClientRelationship,
  ContactChannel,
  DocumentType,
} from "@/types/client";

export const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: "DNI", label: "DNI" },
  { value: "CE", label: "Carné de extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

export const channelOptions: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "llamada", label: "Llamada" },
  { value: "correo", label: "Correo" },
];

export const relationshipOptions: { value: ClientRelationship; label: string }[] = [
  { value: "propietario", label: "Propietario" },
  { value: "tutor", label: "Tutor autorizado" },
  { value: "responsable", label: "Contacto responsable" },
];

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function phoneDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) digits = digits.slice(2);
  return digits;
}

export function phoneError(value: string) {
  const digits = phoneDigits(value);
  if (!digits) return "";
  if (digits.length === 9 && digits.startsWith("9")) return "";
  if (digits.length === 7) return "";
  if (digits.length === 9 && digits.startsWith("01")) return "";
  return "Un celular tiene 9 dígitos y empieza con 9. Un fijo, 7 dígitos.";
}

export function documentError(type: DocumentType | "", number: string) {
  const value = number.trim();
  if (!type && !value) return "";
  if (!type && value) return "Elige el tipo de documento.";
  if (!value) return "";
  if (type === "DNI" && !/^\d{8}$/.test(value)) return "El DNI tiene 8 dígitos.";
  if (type === "CE" && !/^\d{9}$/.test(value)) return "El carné de extranjería tiene 9 dígitos.";
  if (type === "PASAPORTE" && !/^[A-Za-z0-9]{6,12}$/.test(value)) {
    return "Revisa el número de pasaporte.";
  }
  if (type === "OTRO" && value.length < 3) return "El documento es demasiado corto.";
  return "";
}

export function rucError(ruc: string, businessName: string) {
  const digits = ruc.replace(/\D/g, "");
  const name = businessName.trim();
  if (!digits && !name) return "";
  if (!/^(10|20)\d{9}$/.test(digits)) {
    return "El RUC tiene 11 dígitos y empieza con 10 o 20.";
  }
  if (!name) return "Escribe la razón social del RUC.";
  return "";
}

export function emailError(value: string) {
  const email = value.trim();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Revisa el correo.";
  return "";
}

export function birthDateError(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Revisa la fecha.";
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (date > today) return "La fecha no puede ser futura.";
  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (date < oldest) return "Revisa la fecha de nacimiento.";
  return "";
}

export function normalizeDocument(value: string | undefined) {
  const next = (value ?? "").replace(/\s/g, "").toUpperCase();
  return next || null;
}

export function sameDocument(left: string | undefined, right: string | undefined) {
  const a = normalizeDocument(left);
  const b = normalizeDocument(right);
  return Boolean(a && b && a === b);
}

export function samePhone(left: string | undefined, right: string | undefined) {
  const a = phoneDigits(left ?? "");
  const b = phoneDigits(right ?? "");
  return a.length >= 7 && a === b;
}

export function clientMatchesQuery(
  client: Pick<
    Client,
    "name" | "phone" | "phoneAlt" | "email" | "documentType" | "documentNumber" | "ruc" | "businessName"
  >,
  query: string,
) {
  const q = fold(query.trim());
  if (q.length < 2) return false;
  const digits = q.replace(/\D/g, "");
  const phones = [client.phone, client.phoneAlt ?? ""].map((item) => phoneDigits(item));
  const doc = (client.documentNumber ?? "").replace(/\s/g, "");
  const ruc = client.ruc ?? "";
  const label = fold(`${client.documentType ?? ""} ${client.documentNumber ?? ""} ${client.businessName ?? ""}`);
  return (
    fold(client.name).includes(q) ||
    fold(client.email ?? "").includes(q) ||
    fold(client.businessName ?? "").includes(q) ||
    label.includes(q) ||
    fold(doc).includes(q) ||
    (digits.length >= 3 &&
      (doc.replace(/\D/g, "").includes(digits) ||
        ruc.includes(digits) ||
        phones.some((item) => item.includes(digits))))
  );
}
