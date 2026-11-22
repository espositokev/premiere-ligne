/**
 * Coachings terrain (§4.7, §6.5), en fonctions pures.
 */

import { z } from "zod";

export type CoachingStatus = "planifie" | "cloture" | "annule";
/** Statut affiché : « à rédiger » est calculé (fin passée, ni clôturé ni annulé), jamais stocké. */
export type CoachingDisplayStatus = "planifie" | "a_rediger" | "cloture" | "annule";

export const COACHING_STATUS_LABELS: Record<CoachingDisplayStatus, string> = {
  planifie: "À venir",
  a_rediger: "À rédiger",
  cloture: "Clôturé",
  annule: "Annulé",
};

export const COACHING_MODE_LABELS = { terrain: "Sur le terrain", distance: "À distance" } as const;
export type CoachingMode = keyof typeof COACHING_MODE_LABELS;

export const COACHING_DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 h" },
  { value: 180, label: "3 h" },
  { value: 240, label: "Une demi-journée" },
  { value: 480, label: "Une journée" },
] as const;

export const MAX_COACHING_SKILLS = 3;
/** Délai avant le premier rappel de CR, puis intervalle minimal entre deux rappels (§6.5). */
export const REPORT_REMINDER_DELAY_MS = 48 * 3_600_000;
export const REPORT_REMINDER_INTERVAL_MS = 7 * 86_400_000;

type Timing = { status: CoachingStatus; scheduledAt: string; durationMinutes: number };

export function coachingEnd(c: Pick<Timing, "scheduledAt" | "durationMinutes">): Date {
  return new Date(Date.parse(c.scheduledAt) + c.durationMinutes * 60_000);
}

export function displayStatus(c: Timing, now: Date): CoachingDisplayStatus {
  if (c.status !== "planifie") return c.status;
  return coachingEnd(c).getTime() < now.getTime() ? "a_rediger" : "planifie";
}

/** Le compte rendu peut-il être clôturé ? Seulement une fois le coaching commencé. */
export function canClose(c: Timing, now: Date): boolean {
  return c.status === "planifie" && Date.parse(c.scheduledAt) <= now.getTime();
}

/** Nombre de jours entiers écoulés depuis la fin du coaching (ancienneté d'un CR à rédiger). */
export function daysSinceEnd(
  c: Pick<Timing, "scheduledAt" | "durationMinutes">,
  now: Date,
): number {
  return Math.max(0, Math.floor((now.getTime() - coachingEnd(c).getTime()) / 86_400_000));
}

/** Rappel de CR dû : 48 h après la fin, puis une fois par semaine au plus. */
export function reminderDue(c: Timing & { reminderSentAt: string | null }, now: Date): boolean {
  if (displayStatus(c, now) !== "a_rediger") return false;
  if (now.getTime() - coachingEnd(c).getTime() < REPORT_REMINDER_DELAY_MS) return false;
  if (c.reminderSentAt === null) return true;
  return now.getTime() - Date.parse(c.reminderSentAt) >= REPORT_REMINDER_INTERVAL_MS;
}

/** Répartition de la page « Coachings » : à rédiger (plus anciens d'abord), à venir, clôturés, annulés. */
export function groupCoachings<T extends Timing & { closedAt?: string | null }>(
  items: T[],
  now: Date,
) {
  const byDate = (a: T, b: T) => a.scheduledAt.localeCompare(b.scheduledAt);
  const toWrite = items.filter((c) => displayStatus(c, now) === "a_rediger").sort(byDate);
  const upcoming = items.filter((c) => displayStatus(c, now) === "planifie").sort(byDate);
  const closed = items
    .filter((c) => c.status === "cloture")
    .sort((a, b) => (b.closedAt ?? b.scheduledAt).localeCompare(a.closedAt ?? a.scheduledAt));
  const cancelled = items.filter((c) => c.status === "annule").sort((a, b) => byDate(b, a));
  return { toWrite, upcoming, closed, cancelled };
}

// ---------------------------------------------------------------------------
// Plan d'action préparé dans le compte rendu
// ---------------------------------------------------------------------------

export const actionPlanItemSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre à l'action").max(200),
  description: z.string().trim().max(2000).nullable().default(null),
  skillId: z.uuid().nullable().default(null),
  dueDate: z.iso.date().nullable().default(null),
});
export const actionPlanSchema = z.array(actionPlanItemSchema).max(10, "10 actions au maximum");
export type ActionPlanItem = z.infer<typeof actionPlanItemSchema>;

/** Lecture tolérante du plan d'action stocké (ignore ce qui ne respecte pas le format). */
export function parseActionPlan(value: unknown): ActionPlanItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = actionPlanItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

// ---------------------------------------------------------------------------
// Fuseau horaire : l'heure saisie est l'heure de Paris, la base stocke de l'UTC
// ---------------------------------------------------------------------------

export const APP_TIME_ZONE = "Europe/Paris";

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** « 2026-11-25T09:30 » (heure de Paris) → instant UTC (ISO). Null si la saisie est invalide. */
export function localToUtc(local: string, timeZone = APP_TIME_ZONE): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // Deux passes pour tomber juste autour des changements d'heure.
  let guess = naive - zoneOffsetMs(new Date(naive), timeZone);
  guess = naive - zoneOffsetMs(new Date(guess), timeZone);
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** Instant UTC → valeur d'un champ « date et heure » à l'heure de Paris. */
export function utcToLocalInput(iso: string, timeZone = APP_TIME_ZONE): string {
  const instant = new Date(iso);
  const local = new Date(instant.getTime() + zoneOffsetMs(instant, timeZone));
  return local.toISOString().slice(0, 16);
}

/** Date du jour à Paris (AAAA-MM-JJ). */
export function todayInZone(now: Date, timeZone = APP_TIME_ZONE): string {
  return utcToLocalInput(now.toISOString(), timeZone).slice(0, 10);
}

/** Lundi (AAAA-MM-JJ) de la semaine d'une date AAAA-MM-JJ. */
export function weekStart(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Les 7 jours (AAAA-MM-JJ) d'une semaine commençant un lundi. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

export function shiftDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Invitation agenda (.ics, RFC 5545)
// ---------------------------------------------------------------------------

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Coupe les lignes à 75 octets environ, comme l'exige le format. */
function fold(line: string): string {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  chunks.push(rest);
  return chunks.join("\r\n ");
}

export function buildIcs(input: {
  uid: string;
  start: string;
  durationMinutes: number;
  title: string;
  description?: string | null;
  location?: string | null;
  sequence?: number;
  cancelled?: boolean;
  now: Date;
}): string {
  const end = new Date(Date.parse(input.start) + input.durationMinutes * 60_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Premiere Ligne//Coachings//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${input.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}@premiereligne-app.fr`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `DTSTAMP:${icsDate(input.now.toISOString())}`,
    `DTSTART:${icsDate(input.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${icsText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${icsText(input.location)}`] : []),
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** « mardi 25 novembre à 9 h 30 », à l'heure de Paris. */
export function formatWhen(iso: string, timeZone = APP_TIME_ZONE): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("fr-FR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const [hours, minutes] = date
    .toLocaleTimeString("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .split(":");
  return `${day} à ${Number(hours)} h ${minutes}`;
}

/** « 25 nov. », à l'heure de Paris. */
export function formatShortDay(iso: string, timeZone = APP_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone, day: "numeric", month: "short" });
}

/** « 9 h 30 – 11 h 30 », à l'heure de Paris. */
export function formatTimeRange(
  iso: string,
  durationMinutes: number,
  timeZone = APP_TIME_ZONE,
): string {
  const fmt = (d: Date) => {
    const [h, m] = d
      .toLocaleTimeString("fr-FR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
      .split(":");
    return `${Number(h)} h ${m}`;
  };
  const start = new Date(iso);
  return `${fmt(start)} – ${fmt(new Date(start.getTime() + durationMinutes * 60_000))}`;
}
