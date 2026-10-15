export type MedForm =
  | "comprimido"
  | "jarabe"
  | "crema"
  | "gotas"
  | "inyectable"
  | "vacuna"
  | "shampoo"
  | "pipeta"
  | "suspension";

export type VetMedication = {
  id: string;
  name: string;
  form: MedForm;
  category: string;
  units: string[];
};

export const medFormLabel: Record<MedForm, string> = {
  comprimido: "Comprimido",
  jarabe: "Jarabe",
  crema: "Crema",
  gotas: "Gotas",
  inyectable: "Inyectable",
  vacuna: "Vacuna",
  shampoo: "Shampoo",
  pipeta: "Pipeta",
  suspension: "Suspensión",
};

export const doseIntervalUnits = ["minutos", "horas", "días", "semanas"] as const;

export type DoseIntervalUnit = (typeof doseIntervalUnits)[number];

export type AdminRoute =
  | "oral"
  | "tópica"
  | "oftálmica"
  | "ótica"
  | "subcutánea"
  | "intramuscular";

export function routesForMedication(drug: Pick<VetMedication, "form" | "category" | "name">): AdminRoute[] {
  if (drug.form === "inyectable" || drug.form === "vacuna") {
    return ["subcutánea", "intramuscular"];
  }
  const words = fold(`${drug.category} ${drug.name}`).split(/[^a-z]+/);
  if (words.some((word) => word.startsWith("oftalm") || word.startsWith("lagrim"))) return ["oftálmica"];
  if (words.some((word) => word.startsWith("otic"))) return ["ótica"];
  if (
    drug.form === "crema" ||
    drug.form === "shampoo" ||
    drug.form === "pipeta" ||
    drug.form === "gotas"
  ) {
    return ["tópica"];
  }
  return ["oral"];
}

const doseIntervalSingular: Record<DoseIntervalUnit, string> = {
  minutos: "minuto",
  horas: "hora",
  días: "día",
  semanas: "semana",
};

export function formatDoseFrequency(input: {
  once: boolean;
  every: number;
  unit: DoseIntervalUnit;
}) {
  if (input.once) return "una sola dosis";
  const every = Math.round(input.every);
  if (!Number.isFinite(every) || every < 1) return "";
  const word = every === 1 ? doseIntervalSingular[input.unit] : input.unit;
  return `cada ${every} ${word}`;
}

export const vetMedications: VetMedication[] = [
  { id: "apoquel", name: "Apoquel", form: "comprimido", category: "Alergia", units: ["mg", "comprimido"] },
  { id: "prednisolona", name: "Prednisolona", form: "comprimido", category: "Antiinflamatorio", units: ["mg", "comprimido"] },
  { id: "meloxicam", name: "Meloxicam", form: "suspension", category: "Antiinflamatorio", units: ["ml", "mg"] },
  { id: "carprofeno", name: "Carprofeno", form: "comprimido", category: "Antiinflamatorio", units: ["mg", "comprimido"] },
  { id: "amoxicilina", name: "Amoxicilina", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "amoxiclav", name: "Amoxicilina con ácido clavulánico", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "cefalexina", name: "Cefalexina", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "enrofloxacina", name: "Enrofloxacina", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "doxiciclina", name: "Doxiciclina", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "metronidazol", name: "Metronidazol", form: "comprimido", category: "Antibiótico", units: ["mg", "comprimido"] },
  { id: "metoclopramida", name: "Metoclopramida", form: "comprimido", category: "Gastrointestinal", units: ["mg", "comprimido"] },
  { id: "omeprazol", name: "Omeprazol", form: "comprimido", category: "Gastrointestinal", units: ["mg", "comprimido"] },
  { id: "sucralfato", name: "Sucralfato", form: "suspension", category: "Gastrointestinal", units: ["ml"] },
  { id: "probiotico", name: "Probiótico", form: "comprimido", category: "Gastrointestinal", units: ["sobre", "comprimido"] },
  { id: "drontal", name: "Drontal", form: "comprimido", category: "Antiparasitario", units: ["comprimido"] },
  { id: "milbemax", name: "Milbemax", form: "comprimido", category: "Antiparasitario", units: ["comprimido"] },
  { id: "nexgard", name: "NexGard", form: "comprimido", category: "Antiparasitario", units: ["comprimido"] },
  { id: "bravecto", name: "Bravecto", form: "comprimido", category: "Antiparasitario", units: ["comprimido"] },
  { id: "simparica", name: "Simparica", form: "comprimido", category: "Antiparasitario", units: ["comprimido"] },
  { id: "ivermectina", name: "Ivermectina", form: "inyectable", category: "Antiparasitario", units: ["ml", "mg"] },
  { id: "advocate", name: "Advocate", form: "pipeta", category: "Antiparasitario", units: ["pipeta"] },
  { id: "revolution", name: "Revolution", form: "pipeta", category: "Antiparasitario", units: ["pipeta"] },
  { id: "frontline", name: "Frontline", form: "pipeta", category: "Antiparasitario", units: ["pipeta"] },
  { id: "crema-mupirocina", name: "Mupirocina", form: "crema", category: "Dermatológico", units: ["g", "aplicación"] },
  { id: "pomada-oftalmica", name: "Pomada oftálmica", form: "crema", category: "Oftálmico", units: ["cm", "aplicación"] },
  { id: "tobramicina", name: "Tobramicina", form: "gotas", category: "Oftálmico", units: ["gota"] },
  { id: "lagrimas", name: "Lágrimas artificiales", form: "gotas", category: "Oftálmico", units: ["gota"] },
  { id: "otico", name: "Solución ótica", form: "gotas", category: "Dermatológico", units: ["gota", "ml"] },
  { id: "shampoo-clorhexidina", name: "Shampoo de clorhexidina", form: "shampoo", category: "Dermatológico", units: ["ml", "aplicación"] },
  { id: "shampoo-miconazol", name: "Shampoo de miconazol", form: "shampoo", category: "Dermatológico", units: ["ml", "aplicación"] },
  { id: "vacuna-sextuple", name: "Vacuna séxtuple", form: "vacuna", category: "Vacuna", units: ["dosis"] },
  { id: "vacuna-rabia", name: "Vacuna antirrábica", form: "vacuna", category: "Vacuna", units: ["dosis"] },
  { id: "vacuna-triple-felina", name: "Vacuna triple felina", form: "vacuna", category: "Vacuna", units: ["dosis"] },
  { id: "vacuna-leucemia", name: "Vacuna leucemia felina", form: "vacuna", category: "Vacuna", units: ["dosis"] },
  { id: "vacuna-tos", name: "Vacuna tos de las perreras", form: "vacuna", category: "Vacuna", units: ["dosis"] },
  { id: "cytopoint", name: "Cytopoint", form: "inyectable", category: "Alergia", units: ["ml", "dosis"] },
  { id: "convenia", name: "Convenia", form: "inyectable", category: "Antibiótico", units: ["ml"] },
  { id: "cerenia", name: "Cerenia", form: "inyectable", category: "Gastrointestinal", units: ["ml", "mg"] },
  { id: "tramadol", name: "Tramadol", form: "comprimido", category: "Analgésico", units: ["mg", "comprimido"] },
  { id: "gabapentina", name: "Gabapentina", form: "comprimido", category: "Analgésico", units: ["mg", "comprimido"] },
];

export function searchVetMedications(query: string) {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];
  return vetMedications
    .filter((item) => {
      const haystack = fold(`${item.name} ${item.category} ${medFormLabel[item.form]}`);
      return haystack.includes(needle);
    })
    .slice(0, 8);
}

export function formatDoseCourse(days: number) {
  const count = Math.round(days);
  if (!Number.isFinite(count) || count < 1) return "";
  return count === 1 ? "por 1 día" : `por ${count} días`;
}

export function prescriptionLine(input: {
  name: string;
  amount: string;
  unit: string;
  route: string;
  frequency: string;
  days?: number;
}) {
  const course = input.days ? formatDoseCourse(input.days) : "";
  const base = `${input.name} · ${input.amount} ${input.unit} · vía ${input.route} · ${input.frequency}`;
  return course ? `${base} · ${course}` : base;
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
