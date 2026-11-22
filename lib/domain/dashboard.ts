/**
 * Indicateurs des tableaux de bord (§4.10, §6.2, §6.3, §6.5), en fonctions pures.
 */

import { countOverdue, type ActionStatus } from "./actions";
import { coachingEnd, type CoachingStatus } from "./coaching";
import {
  activeSkills,
  activeSkillsOf,
  averageOf,
  latestScores,
  masteryPercent,
  scoreReader,
  validatedOfKind,
  type EvaluationRecord,
} from "./evaluation";
import type { FrameworkTree } from "./framework";

export type DashboardRep = {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
};
export type DashboardCoaching = {
  subjectMembershipId: string;
  coachName: string;
  status: CoachingStatus;
  scheduledAt: string;
  durationMinutes: number;
  closedAt: string | null;
};
export type DashboardAction = {
  subjectMembershipId: string;
  status: ActionStatus;
  dueDate: string | null;
};

const DAY = 86_400_000;

export type RepRow = {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  mastery: number | null;
  lastEvaluatedAt: string | null;
  lastCoachingAt: string | null;
  /** Jours depuis le dernier coaching clôturé ; null = jamais coaché. */
  daysSinceCoaching: number | null;
  overdueActions: number;
};

/** Une ligne par commercial : % de maîtrise, dernière évaluation, dernier coaching, actions en retard. */
export function repRows(input: {
  reps: DashboardRep[];
  tree: FrameworkTree;
  evaluations: (EvaluationRecord & { subjectMembershipId: string })[];
  coachings: DashboardCoaching[];
  actions: DashboardAction[];
  now: Date;
  today: string;
}): RepRow[] {
  return input.reps
    .map((rep) => {
      const evaluations = input.evaluations.filter((e) => e.subjectMembershipId === rep.id);
      const [lastEvaluation] = validatedOfKind(evaluations, "manager");
      const lastCoaching = input.coachings
        .filter((c) => c.subjectMembershipId === rep.id && c.status === "cloture")
        .map((c) => c.scheduledAt)
        .sort()
        .at(-1);
      return {
        id: rep.id,
        name: rep.name,
        teamId: rep.teamId,
        teamName: rep.teamName,
        mastery: masteryPercent(input.tree, latestScores(evaluations)),
        lastEvaluatedAt: lastEvaluation?.validatedAt ?? null,
        lastCoachingAt: lastCoaching ?? null,
        daysSinceCoaching: lastCoaching
          ? Math.floor((input.now.getTime() - Date.parse(lastCoaching)) / DAY)
          : null,
        overdueActions: countOverdue(
          input.actions.filter((a) => a.subjectMembershipId === rep.id),
          input.today,
        ),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Commerciaux sans coaching clôturé depuis plus de N jours (ou jamais), les plus anciens d'abord (§6.5). */
export function withoutCoaching(rows: RepRow[], days: number): RepRow[] {
  return rows
    .filter((r) => r.daysSinceCoaching === null || r.daysSinceCoaching > days)
    .sort((a, b) => (b.daysSinceCoaching ?? Infinity) - (a.daysSinceCoaching ?? Infinity));
}

/**
 * Radar d'équipe (§6.2) : pour chaque compétence, moyenne des moyennes des commerciaux
 * (un commercial sans note sur la compétence est ignoré).
 */
export function teamRadar(
  tree: FrameworkTree,
  evaluationsByRep: EvaluationRecord[][],
): {
  competencyId: string;
  label: string;
  block: string;
  current: number | null;
  previous: null;
  self: null;
}[] {
  const readers = evaluationsByRep.map((evaluations) => scoreReader(latestScores(evaluations)));
  return tree.blocks
    .filter((b) => b.active)
    .flatMap((block) =>
      block.competencies
        .filter((c) => c.active && activeSkills(c).length > 0)
        .map((competency) => {
          const repAverages = readers
            .map((read) => averageOf(activeSkills(competency), read).value)
            .filter((v): v is number => v !== null);
          return {
            competencyId: competency.id,
            label: competency.name,
            block: block.name,
            current: repAverages.length
              ? repAverages.reduce((s, v) => s + v, 0) / repAverages.length
              : null,
            previous: null,
            self: null,
          };
        }),
    );
}

/**
 * Sous-compétences les plus faibles de l'équipe (pour orienter des formations collectives) :
 * moyenne des dernières notes des commerciaux évalués, de la plus basse à la plus haute.
 */
export function weakestSkills(
  tree: FrameworkTree,
  evaluationsByRep: EvaluationRecord[][],
  limit = 5,
): { skillId: string; name: string; competency: string; average: number; rated: number }[] {
  const latest = evaluationsByRep.map((evaluations) => latestScores(evaluations));
  const competencyOf = new Map(
    tree.blocks.flatMap((b) =>
      b.competencies.flatMap((c) => c.skills.map((s) => [s.id, c.name] as const)),
    ),
  );
  return activeSkillsOf(tree)
    .map((skill) => {
      const scores = latest
        .map((m) => m.get(skill.id)?.score)
        .filter((v): v is number => v !== undefined);
      return {
        skillId: skill.id,
        name: skill.name,
        competency: competencyOf.get(skill.id) ?? "",
        average: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : Infinity,
        rated: scores.length,
      };
    })
    .filter((s) => s.rated > 0)
    .sort((a, b) => a.average - b.average || b.rated - a.rated)
    .slice(0, limit);
}

/** Coachings clôturés par mois (6 derniers mois) et par coach. */
export function closedPerMonth(coachings: DashboardCoaching[], now: Date, months = 6) {
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const coaches = [
    ...new Set(coachings.filter((c) => c.status === "cloture").map((c) => c.coachName)),
  ].sort();
  const rows = keys.map((month) => {
    const row: Record<string, number | string> = {
      month,
      label: new Date(`${month}-15T12:00:00Z`).toLocaleDateString("fr-FR", {
        month: "short",
        timeZone: "UTC",
      }),
    };
    for (const coach of coaches) {
      row[coach] = coachings.filter(
        (c) =>
          c.status === "cloture" && c.coachName === coach && (c.closedAt ?? "").startsWith(month),
      ).length;
    }
    return row;
  });
  return { coaches, rows };
}

/** Part des CR clôturés dans les 48 h suivant la fin du coaching (90 derniers jours). Null si aucun. */
export function reportsOnTimeRate(coachings: DashboardCoaching[], now: Date): number | null {
  const since = now.getTime() - 90 * DAY;
  const closed = coachings.filter(
    (c) => c.status === "cloture" && c.closedAt && Date.parse(c.closedAt) >= since,
  );
  if (closed.length === 0) return null;
  const onTime = closed.filter(
    (c) => Date.parse(c.closedAt ?? "") - coachingEnd(c).getTime() <= 2 * DAY,
  ).length;
  return Math.round((onTime / closed.length) * 100);
}

/** Couverture : part des commerciaux évalués (évaluation manager validée) dans les 90 derniers jours. */
export function coverageRate(rows: RepRow[], now: Date): number | null {
  if (rows.length === 0) return null;
  const since = now.getTime() - 90 * DAY;
  const covered = rows.filter(
    (r) => r.lastEvaluatedAt && Date.parse(r.lastEvaluatedAt) >= since,
  ).length;
  return Math.round((covered / rows.length) * 100);
}

/** Moyenne simple de % de maîtrise (commerciaux ayant un %), arrondie. */
export function averageMastery(rows: RepRow[]): number | null {
  const values = rows.map((r) => r.mastery).filter((v): v is number => v !== null);
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;
}

/** CSV lisible par Excel en français : séparateur « ; », BOM UTF-8, guillemets échappés. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const text = v === null ? "" : String(v);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
