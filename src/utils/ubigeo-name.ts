import { fold } from "@/utils/client-fields";

const smallWords = new Set(["de", "del", "la", "las", "los", "y", "e", "el"]);

const accentedWords: Record<string, string> = {
  ancash: "Áncash",
  ancon: "Ancón",
  andres: "Andrés",
  apurimac: "Apurímac",
  asuncion: "Asunción",
  azangaro: "Azángaro",
  bolivar: "Bolívar",
  bongara: "Bongará",
  caceres: "Cáceres",
  camana: "Camaná",
  canete: "Cañete",
  caraveli: "Caravelí",
  carrion: "Carrión",
  celendin: "Celendín",
  chepen: "Chepén",
  chimu: "Chimú",
  concepcion: "Concepción",
  contumaza: "Contumazá",
  convencion: "Convención",
  ferrenafe: "Ferreñafe",
  huaman: "Huamán",
  huamanga: "Huamanga",
  huancane: "Huancané",
  huanuco: "Huánuco",
  huarochiri: "Huarochirí",
  jaen: "Jaén",
  jesus: "Jesús",
  jose: "José",
  julcan: "Julcán",
  junin: "Junín",
  lurin: "Lurín",
  maranon: "Marañón",
  maria: "María",
  martin: "Martín",
  morropon: "Morropón",
  nicolas: "Nicolás",
  oyon: "Oyón",
  peru: "Perú",
  purus: "Purús",
  ramon: "Ramón",
  rimac: "Rímac",
  roman: "Román",
  sanchez: "Sánchez",
  sebastian: "Sebastián",
  simon: "Simón",
  union: "Unión",
  viru: "Virú",
};

export function formatUbigeoName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const plain = fold(word);
      const accented = accentedWords[plain];
      if (accented) return accented;
      if (index > 0 && smallWords.has(plain)) return plain;
      const lower = word.toLocaleLowerCase("es-PE");
      return lower.charAt(0).toLocaleUpperCase("es-PE") + lower.slice(1);
    })
    .join(" ");
}
