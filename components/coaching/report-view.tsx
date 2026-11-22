import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import type { CoachingReport } from "@/lib/data/coachings";
import { fr } from "@/lib/i18n/fr";

/** Compte rendu clôturé, en lecture. */
export function ReportView({
  report,
  skills,
  observations,
  skillNames,
}: {
  report: CoachingReport | null;
  skills: { id: string; name: string }[];
  observations: Record<string, { score: number | null; comment: string | null }>;
  skillNames: Map<string, string>;
}) {
  const after: [string, string | null | undefined][] = [
    ["Points forts", report?.strengths],
    ["Axes de progrès", report?.improvements],
  ];
  return (
    <div className="flex flex-col gap-4">
      {report?.context ? <TextCard title="Contexte" body={report.context} /> : null}
      <Card className="p-0">
        <h2 className="border-b border-line px-4 py-3 font-display font-semibold">Observations</h2>
        <ul className="divide-y divide-line">
          {skills.map((skill) => {
            const o = observations[skill.id];
            return (
              <li key={skill.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{skill.name}</p>
                  <p className="text-xs text-muted">
                    {o?.score != null
                      ? `${fr.levels[o.score as 0 | 1 | 2 | 3 | 4]} · observée en coaching`
                      : "Pas de note"}
                  </p>
                  {o?.comment ? (
                    <p className="mt-1 text-sm whitespace-pre-line text-forest-light">
                      {o.comment}
                    </p>
                  ) : null}
                </div>
                <ScoreBadge score={o?.score ?? null} />
              </li>
            );
          })}
        </ul>
      </Card>
      {after.map(([title, body]) =>
        body ? <TextCard key={title} title={title} body={body} /> : null,
      )}
      {report?.actionPlan.length ? (
        <Card>
          <h2 className="mb-2 font-display font-semibold">Plan d&apos;action</h2>
          <ul className="flex flex-col gap-2">
            {report.actionPlan.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-forest"
                />
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    {[
                      a.skillId ? skillNames.get(a.skillId) : null,
                      a.dueDate
                        ? `pour le ${new Date(`${a.dueDate}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function TextCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className="mb-1 font-display font-semibold">{title}</h2>
      <p className="whitespace-pre-line">{body}</p>
    </Card>
  );
}
