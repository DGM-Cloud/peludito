const notes: Record<string, (pet: string) => string> = {
  consulta: (pet) =>
    `Llega unos minutos antes. En recepción reciben a ${pet}.`,
  control: (pet) =>
    `Trae el tratamiento que ${pet} esté tomando, para revisar cómo va.`,
  vacunacion: (pet) =>
    `Trae el carnet de vacunas de ${pet}. Si hoy está decaído o con diarrea, avísanos antes de venir.`,
  desparasitacion: (pet) =>
    `Si recuerdas la fecha de la última dosis de ${pet}, coméntasela al veterinario.`,
  cirugia: (pet) =>
    `Ven con correa o transportadora. En recepción te indican cómo preparar a ${pet}.`,
  grooming: (pet) =>
    `Trae a ${pet} con correa o en transportadora. El baño y el corte no incluyen accesorios.`,
  emergencia: (pet) =>
    `Ven de inmediato con ${pet}. Si puedes, anota desde cuándo empezó el malestar.`,
};

export function visitNote(serviceType: string, petName?: string) {
  const pet = petName?.trim() || "tu mascota";
  return (
    notes[serviceType]?.(pet) ??
    `Llega unos minutos antes. En recepción reciben a ${pet}.`
  );
}
