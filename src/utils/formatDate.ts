const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatLongDate(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return longDateFormatter.format(d);
}

export function formatTime(time: string): string {
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  return timeFormatter.format(new Date(time));
}

export function todayISODate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const limaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function limaClock(date = new Date()) {
  const parts = limaFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(pick("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(pick("minute"));
  return {
    isoDate: `${pick("year")}-${pick("month")}-${pick("day")}`,
    minutesOfDay: hour * 60 + minute,
  };
}

function clockLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayISODate(date);
}

export function nextBookableSlot(now = new Date(), step = 15) {
  const clock = limaClock(now);
  const remainder = clock.minutesOfDay % step;
  const next =
    remainder === 0 ? clock.minutesOfDay : clock.minutesOfDay + (step - remainder);
  if (next >= 24 * 60) {
    return { date: addIsoDays(clock.isoDate, 1), time: "09:00" };
  }
  return { date: clock.isoDate, time: clockLabel(next) };
}

export function openingAppointment(preferredDate?: string, now = new Date()) {
  const today = limaClock(now).isoDate;
  const preferred = preferredDate?.slice(0, 10) ?? "";
  if (preferred > today) return { date: preferred, time: "09:00" };
  return nextBookableSlot(now);
}

export function isPastAppointment(date: string, time: string, now = new Date()) {
  const day = date.slice(0, 10);
  const clock = limaClock(now);
  if (!day || day < clock.isoDate) return true;
  if (day > clock.isoDate) return false;
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return true;
  return hour * 60 + minute < clock.minutesOfDay;
}

export function pastAppointmentMessage(now = new Date()) {
  const next = nextBookableSlot(now);
  const today = limaClock(now).isoDate;
  if (next.date === today) {
    return `Esa hora ya pasó. La próxima disponible es a las ${next.time}.`;
  }
  return "Esa hora ya pasó. Hoy ya no queda horario para agendar.";
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
