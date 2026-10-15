export function whatsappDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export function whatsappHref(phone: string, text: string) {
  const digits = whatsappDigits(phone);
  if (digits.length < 11) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function appointmentShareText(input: {
  clinicName: string;
  clientName: string;
  petName: string;
  serviceName: string;
  dateLabel: string;
  time: string;
  vetName: string;
  link: string;
}) {
  const firstName = input.clientName.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const lines = [
    greeting,
    "",
    `Te escribimos de ${input.clinicName}. La cita de ${input.petName} ya está agendada:`,
    "",
    `Servicio: ${input.serviceName}`,
    `Fecha: ${input.dateLabel}`,
    `Hora: ${input.time}`,
  ];
  if (input.vetName) lines.push(`Veterinario: ${input.vetName}`);
  lines.push(
    "",
    "Confirma tu asistencia, o avísanos si no puedes venir, desde este enlace:",
    input.link,
    "",
    "Te esperamos.",
    input.clinicName,
  );
  return lines.join("\n");
}

export function appointmentGroupShareText(input: {
  clinicName: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  vetName: string;
  visits: { petName: string; time: string; link: string }[];
}) {
  const only = input.visits[0];
  if (input.visits.length === 1 && only) {
    return appointmentShareText({
      clinicName: input.clinicName,
      clientName: input.clientName,
      petName: only.petName,
      serviceName: input.serviceName,
      dateLabel: input.dateLabel,
      time: only.time,
      vetName: input.vetName,
      link: only.link,
    });
  }
  const firstName = input.clientName.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const lines = [
    greeting,
    "",
    `Te escribimos de ${input.clinicName}. Quedaron agendadas las citas:`,
    "",
  ];
  for (const visit of input.visits) {
    lines.push(`${visit.petName} — ${input.serviceName} — ${visit.time}`, visit.link, "");
  }
  lines.push(`Fecha: ${input.dateLabel}`);
  if (input.vetName) lines.push(`Veterinario: ${input.vetName}`);
  lines.push(
    "",
    "Confirma la asistencia de cada mascota desde su enlace.",
    "",
    "Te esperamos.",
    input.clinicName,
  );
  return lines.join("\n");
}

export function vaccineReminderText(input: {
  clinicName: string;
  clientName: string;
  petName: string;
  vaccineName: string;
  nextDueLabel: string;
  status: "proxima" | "vencida" | string;
}) {
  const firstName = input.clientName.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const dueLine =
    input.status === "vencida"
      ? `La próxima dosis de ${input.vaccineName} para ${input.petName} venció el ${input.nextDueLabel}.`
      : `La próxima dosis de ${input.vaccineName} para ${input.petName} es el ${input.nextDueLabel}.`;
  return [
    greeting,
    "",
    `Te escribimos de ${input.clinicName}.`,
    dueLine,
    "",
    "¿Agendamos la cita de refuerzo?",
    "",
    input.clinicName,
  ].join("\n");
}

export function groomingShareText(input: {
  clinicName: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  time: string;
  professional: string;
  petNames: string[];
}) {
  const firstName = input.clientName.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";
  const booked =
    input.petNames.length > 1
      ? `Quedaron agendadas ${input.petNames.length} mascotas para ${input.serviceName}:`
      : `Quedó agendado ${input.serviceName}:`;
  const lines = [
    greeting,
    "",
    `Te escribimos de ${input.clinicName}. ${booked}`,
    "",
    ...input.petNames.map((name) => `${name} — ${input.time}`),
    "",
    `Fecha: ${input.dateLabel}`,
    `Hora: ${input.time}`,
  ];
  if (input.professional) lines.push(`Profesional: ${input.professional}`);
  lines.push("", "Te esperamos.", input.clinicName);
  return lines.join("\n");
}
