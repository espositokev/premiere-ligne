import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { DojoSessionSummary } from "@/lib/data/dojo-sessions";

function day(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Séances de Dojo : date, participants, scénario, ce qui a marché, axe et engagement. */
export function SessionList({
  sessions,
  dojoHref,
  showDojo = false,
}: {
  sessions: DojoSessionSummary[];
  dojoHref?: (s: DojoSessionSummary) => string;
  showDojo?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {sessions.map((s) => (
        <li key={s.id}>
          <Card className="flex flex-col gap-2">
            <div>
              {showDojo && dojoHref ? (
                <Link href={dojoHref(s)} className="font-semibold text-forest-deep hover:underline">
                  {s.dojoTitle}
                </Link>
              ) : null}
              <p className="text-sm text-muted">
                {day(s.heldOn)} · {s.coachName}
                {s.scenario
                  ? ` · Scénario ${s.scenario}${s.scenarioTitle ? ` (${s.scenarioTitle})` : ""}`
                  : ""}
              </p>
              <p className="text-sm font-medium">{s.participants.map((p) => p.name).join(", ")}</p>
            </div>
            <dl className="grid gap-2 text-sm">
              {(
                [
                  ["Ce qui a marché", s.wentWell],
                  ["Axe prioritaire", s.priorityAxis],
                  ["Engagement", s.commitment],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt className="font-semibold text-muted">{label}</dt>
                    <dd className="whitespace-pre-line">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  );
}
