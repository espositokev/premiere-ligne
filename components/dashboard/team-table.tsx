import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { RepRow } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";

function shortDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Paris",
      })
    : "—";
}

function MasteryBar({ value }: { value: number | null }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-16 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full rounded-full bg-forest" style={{ width: `${value ?? 0}%` }} />
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {value === null ? "–" : `${value} %`}
      </span>
    </span>
  );
}

/** Commerciaux suivis : cartes sur téléphone, tableau sur ordinateur. */
export function TeamTable({
  rows,
  slug,
  showTeam,
  daysWithoutCoaching,
}: {
  rows: RepRow[];
  slug: string;
  showTeam: boolean;
  daysWithoutCoaching: number;
}) {
  const late = (r: RepRow) =>
    r.daysSinceCoaching === null || r.daysSinceCoaching > daysWithoutCoaching;
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/e/${slug}/equipe/${r.id}`}
              className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted">
                  {showTeam && r.teamName ? `${r.teamName} · ` : ""}Éval.{" "}
                  {shortDate(r.lastEvaluatedAt)} ·{" "}
                  <span className={cn(late(r) && "font-semibold text-danger")}>
                    Coaching {shortDate(r.lastCoachingAt)}
                  </span>
                  {r.overdueActions ? (
                    <span className="font-semibold text-danger">
                      {" "}
                      · {r.overdueActions} en retard
                    </span>
                  ) : null}
                </p>
              </div>
              <MasteryBar value={r.mastery} />
              <ChevronRight aria-hidden="true" className="size-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-(--radius-card) border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bone text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Commercial</th>
              {showTeam ? <th className="px-4 py-3 font-semibold">Équipe</th> : null}
              <th className="px-4 py-3 font-semibold">Maîtrise</th>
              <th className="px-4 py-3 font-semibold">Dernière évaluation</th>
              <th className="px-4 py-3 font-semibold">Dernier coaching</th>
              <th className="px-4 py-3 font-semibold">Actions en retard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-bone">
                <td className="px-4 py-3">
                  <Link
                    href={`/e/${slug}/equipe/${r.id}`}
                    className="font-semibold hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                {showTeam ? <td className="px-4 py-3 text-muted">{r.teamName ?? "—"}</td> : null}
                <td className="px-4 py-3">
                  <MasteryBar value={r.mastery} />
                </td>
                <td className="px-4 py-3 tabular-nums">{shortDate(r.lastEvaluatedAt)}</td>
                <td
                  className={cn("px-4 py-3 tabular-nums", late(r) && "font-semibold text-danger")}
                >
                  {shortDate(r.lastCoachingAt)}
                  {r.daysSinceCoaching !== null ? (
                    <span className="font-normal text-muted"> ({r.daysSinceCoaching} j)</span>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 tabular-nums",
                    r.overdueActions > 0 && "font-semibold text-danger",
                  )}
                >
                  {r.overdueActions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
