import type {
  AllergySeverity,
  AllergyStatus,
  HandlingAlert,
  InfoSource,
  ReproductiveStatus,
  Species,
} from "@/types/patient";
import { fold } from "@/utils/client-fields";

export const MICROCHIP_DIGITS = 15;

export const speciesOptions: { value: Species; label: string }[] = [
  { value: "perro", label: "Perro" },
  { value: "gato", label: "Gato" },
  { value: "ave", label: "Ave" },
  { value: "conejo", label: "Conejo" },
  { value: "hamster", label: "Hámster" },
  { value: "cobayo", label: "Cobayo" },
  { value: "tortuga", label: "Tortuga" },
  { value: "reptil", label: "Reptil" },
  { value: "otro", label: "Otro" },
];

export const speciesValues = new Set(speciesOptions.map((item) => item.value));

const sharedBreeds = ["Mestizo", "Desconocida"];

const breedsBySpecies: Record<Species, string[]> = {
  perro: [
    "Labrador",
    "Golden retriever",
    "Pastor alemán",
    "Bulldog francés",
    "Poodle",
    "Chihuahua",
    "Schnauzer",
    "Dachshund",
    "Beagle",
    "Shih tzu",
    "Pug",
    ...sharedBreeds,
  ],
  gato: ["Siamés", "Persa", "Maine coon", "Angora", "Bengalí", "Azul ruso", ...sharedBreeds],
  ave: ["Loro", "Periquito", "Canario", "Cacatúa", "Gallina", ...sharedBreeds],
  conejo: ["Belier", "Angora", "Cabeza de león", "Rex", ...sharedBreeds],
  hamster: ["Sirio", "Ruso", "Roborovski", ...sharedBreeds],
  cobayo: ["Americano", "Abisinio", "Peruano", ...sharedBreeds],
  tortuga: ["De orejas rojas", "Motelo", "Terrestre", ...sharedBreeds],
  reptil: ["Gecko", "Iguana", "Serpiente", ...sharedBreeds],
  otro: [...sharedBreeds],
};

export function breedOptions(species: Species) {
  return [...breedsBySpecies[species], "Otra"].map((label) => ({ value: label, label }));
}

export const reproductiveOptions: { value: ReproductiveStatus; label: string }[] = [
  { value: "entero", label: "No esterilizado" },
  { value: "esterilizado", label: "Esterilizado" },
  { value: "desconocido", label: "Desconocido" },
];

export const handlingOptions: { value: HandlingAlert; label: string }[] = [
  { value: "miedo", label: "Miedo intenso" },
  { value: "agresividad", label: "Agresividad" },
  { value: "contacto", label: "Sensible al contacto" },
  { value: "manipulacion", label: "Difícil de manipular" },
];

export const severityOptions: { value: AllergySeverity; label: string }[] = [
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "grave", label: "Grave" },
];

export const allergyStatusOptions: { value: AllergyStatus; label: string }[] = [
  { value: "confirmada", label: "Confirmada" },
  { value: "sospechada", label: "Sospechada" },
];

export const infoSourceOptions: { value: InfoSource | ""; label: string }[] = [
  { value: "", label: "Sin indicar" },
  { value: "tutor", label: "Tutor" },
  { value: "documento", label: "Documento anterior" },
  { value: "evaluacion", label: "Evaluación veterinaria" },
];

const weightBand: Record<Species, { min: number; max: number; extreme: number }> = {
  perro: { min: 0.2, max: 90, extreme: 70 },
  gato: { min: 0.3, max: 15, extreme: 12 },
  ave: { min: 0.01, max: 8, extreme: 4 },
  conejo: { min: 0.2, max: 12, extreme: 8 },
  hamster: { min: 0.02, max: 0.4, extreme: 0.25 },
  cobayo: { min: 0.2, max: 2, extreme: 1.6 },
  tortuga: { min: 0.05, max: 40, extreme: 20 },
  reptil: { min: 0.01, max: 50, extreme: 20 },
  otro: { min: 0.01, max: 200, extreme: 80 },
};

export function normalizeMicrochip(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function microchipError(value: string) {
  const digits = normalizeMicrochip(value);
  if (!digits) return "";
  if (digits.length !== MICROCHIP_DIGITS) {
    return `El microchip tiene ${MICROCHIP_DIGITS} dígitos.`;
  }
  return "";
}

export function birthDateError(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Revisa la fecha de nacimiento.";
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (date > today) return "La fecha de nacimiento no puede ser futura.";
  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 40);
  if (date < oldest) return "Revisa la fecha de nacimiento.";
  return "";
}

export function weightProblem(species: Species, value: number, confirmedExtreme: boolean) {
  if (!Number.isFinite(value) || value <= 0) return "El peso tiene que ser un número mayor que cero.";
  const band = weightBand[species];
  if (value < band.min || value > band.max) {
    return `Ese peso no es plausible para un ${speciesLabel(species).toLowerCase()}.`;
  }
  if (value > band.extreme && !confirmedExtreme) {
    return "Es un peso alto para esta especie. Confírmalo antes de guardarlo.";
  }
  return "";
}

export function speciesLabel(species: Species) {
  return speciesOptions.find((item) => item.value === species)?.label ?? "Otro";
}

export function samePetName(left: string, right: string) {
  return fold(left).length > 1 && fold(left) === fold(right);
}

export function formatPatientAge(patient: {
  birthDate?: string;
  birthIsEstimated?: boolean;
  ageYears?: number | null;
  ageMonths?: number | null;
}) {
  if (patient.birthIsEstimated) {
    const years = patient.ageYears ?? 0;
    const months = patient.ageMonths ?? 0;
    const parts = [
      years > 0 ? (years === 1 ? "1 año" : `${years} años`) : "",
      months > 0 ? (months === 1 ? "1 mes" : `${months} meses`) : "",
    ].filter(Boolean);
    return parts.length ? `Aprox. ${parts.join(" y ")}` : "Edad aproximada";
  }
  if (!patient.birthDate) return "Edad no registrada";
  const birth = new Date(`${patient.birthDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return "Edad no registrada";
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
    months += 12;
  }
  if (today.getDate() < birth.getDate()) months -= 1;
  if (years <= 0) {
    const total = Math.max(months, 0);
    return total === 1 ? "1 mes" : `${total} meses`;
  }
  return years === 1 ? "1 año" : `${years} años`;
}

export function patientCodeFromId(id: string) {
  return `PL-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
