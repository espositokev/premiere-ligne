import { CalendarClock, ChevronRight, MapPin, Video } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CoachingSummary } from "@/lib/data/coachings";
import {
  COACHING_STATUS_LABELS,
  daysSinceEnd,
  displayStatus,
  formatTimeRange,
  formatWhen,
  type CoachingDisplayStatus,
} from "@/lib/domain/coaching";

const STATUS_TONE: Record<CoachingDisplayStatus, "accent" | "danger" | "success" | "muted"> = {
  planifie: "accent",
  a_rediger: "danger",
  cloture: "success",
  annule: "muted",
};

/** Liste de coachings, une ligne tactile par coaching. */
export function CoachingList({
  coachings,
  now,
  hrefFor,
  showRep = true,
  showCoach = false,
}: {
  coachings: CoachingSummary[];
  now: Date;
  hrefFor: (c: CoachingSummary) => string;
  showRep?: boolean;
  showCoach?: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface">
      {coachings.map((c) => {
        const status = displayStatus(c, now);
        const days = status === "a_rediger" ? daysSinceEnd(c, now) : 0;
        const ModeIcon = c.mode === "distance" ? Video : MapPin;
        return (
          <li key={c.id}>
            <Link
              href={hrefFor(c)}
              className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-bone"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {showRep ? c.subjectName : showCoach ? `Avec ${c.coachName}` : "Coaching"}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="first-letter:uppercase">{formatWhen(c.scheduledAt)}</span>
                </p>
                {c.skills.length ? (
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-forest-light">
                    <ModeIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{c.skills.map((s) => s.name).join(" · ")}</span>
                  </p>
                ) : null}
              </div>
              <Badge tone={STATUS_TONE[status]}>
                {status === "a_rediger" && days > 0
                  ? `À rédiger · ${days} j`
                  : COACHING_STATUS_LABELS[status]}
              </Badge>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Vue semaine (§4.7) : une colonne par jour sur ordinateur, une liste par jour sur téléphone. */
export function WeekCalendar({
  days,
  coachings,
  today,
  hrefFor,
  dayOf,
}: {
  days: string[];
  coachings: CoachingSummary[];
  today: string;
  hrefFor: (c: CoachingSummary) => string;
  dayOf: (iso: string) => string;
}) {
  return (
    <ol className="grid gap-2 md:grid-cols-7">
      {days.map((day) => {
        const items = coachings
          .filter((c) => dayOf(c.scheduledAt) === day && c.status !== "annule")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        const date = new Date(`${day}T12:00:00Z`);
        const isToday = day === today;
        return (
          <li
            key={day}
            className={`rounded-(--radius-card) border bg-surface p-2 md:min-h-40 ${isToday ? "border-forest" : "border-line"}`}
          >
            <p
              className={`mb-2 text-sm font-semibold first-letter:uppercase ${isToday ? "text-forest-deep" : "text-muted"}`}
            >
              {date.toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
              {isToday ? " · aujourd'hui" : ""}
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-subtle md:hidden">Rien de prévu</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {items.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={hrefFor(c)}
                      className={`block rounded-(--radius-control) px-2 py-1.5 text-xs hover:opacity-90 ${
                        c.status === "cloture"
                          ? "bg-forest/8 text-forest-deep"
                          : "bg-fluo/60 text-forest-deep"
                      }`}
                    >
                      <span className="font-semibold">
                        {formatTimeRange(c.scheduledAt, c.durationMinutes).split(" – ")[0]}
                      </span>{" "}
                      {c.subjectName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
