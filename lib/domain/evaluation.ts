/**
 * Calculs des évaluations (§6.1 à §6.3), en fonctions pures.
 *
 * Vocabulaire : la « sous-compétence » notée de 0 à 4 s'appelle skill ; elle appartient à une
 * « compétence » (competency), elle-même rangée dans un bloc.
 */

import type { CompetencyNode, FrameworkTree, SkillNode } from "./framework";
import { isMastered } from "./levels";

export type EvaluationKind = "manager" | "self";
export type EvaluationStatus = "brouillon" | "validee";

/** Une évaluation avec ses notes (skillId → note, null = non évaluée). */
export type EvaluationRecord = {
  id: string;
  kind: EvaluationKind;
  status: EvaluationStatus;
  validatedAt: string | null;
  scores: Record<string, number | null>;
};

/** Dernière note d'une sous-compétence et la note qui la précédait. */
export type LatestScore = {
  score: number;
  evaluatedAt: string;
  evaluationId: string;
  previousScore: number | null;
};

export type Trend = "up" | "down" | "same";

/** Évaluations validées d'un type, de la plus récente à la plus ancienne. */
export function validatedOfKind(
  evaluations: EvaluationRecord[],
  kind: EvaluationKind,
): (EvaluationRecord & { validatedAt: string })[] {
  return evaluations
    .filter(
      (e): e is EvaluationRecord & { validatedAt: string } =>
        e.kind === kind && e.status === "validee" && e.validatedAt !== null,
    )
    .sort((a, b) => b.validatedAt.localeCompare(a.validatedAt) || b.id.localeCompare(a.id));
}

/**
 * Dernière note de chaque sous-compétence (§6.1) : celle de la dernière évaluation validée
 * de type manager qui contient une note pour elle. Les auto-évaluations ne comptent pas
 * (passer kind = "self" pour obtenir la dernière auto-évaluation, affichée à part).
 */
export function latestScores(
  evaluations: EvaluationRecord[],
  kind: EvaluationKind = "manager",
): Map<string, LatestScore> {
  const result = new Map<string, LatestScore>();
  for (const evaluation of validatedOfKind(evaluations, kind)) {
    for (const [skillId, score] of Object.entries(evaluation.scores)) {
      if (score === null) continue;
      const known = result.get(skillId);
      if (!known) {
        result.set(skillId, {
          score,
          evaluatedAt: evaluation.validatedAt,
          evaluationId: evaluation.id,
          previousScore: null,
        });
      } else if (known.previousScore === null && known.evaluationId !== evaluation.id) {
        known.previousScore = score;
      }
    }
  }
  return result;
}

/**
 * Notes telles qu'elles étaient avant la dernière évaluation manager validée :
 * c'est « l'évaluation précédente » affichée en clair sur le radar.
 */
export function previousLatestScores(evaluations: EvaluationRecord[]): Map<string, LatestScore> {
  const [latest] = validatedOfKind(evaluations, "manager");
  if (!latest) return new Map();
  return latestScores(evaluations.filter((e) => e.id !== latest.id));
}

/** Évolution d'une note depuis la précédente (↑ ↓ =), null s'il n'y a rien à comparer. */
export function trend(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null;
  }
  if (current > previous) return "up" satisfies Trend;
  if (current < previous) return "down" satisfies Trend;
  return "same" satisfies Trend;
}

/** Sous-compétences actives d'une compétence. */
export function activeSkills(competency: CompetencyNode): SkillNode[] {
  return competency.active ? competency.skills.filter((s) => s.active) : [];
}

/** Toutes les sous-compétences actives du référentiel (blocs et compétences actifs). */
export function activeSkillsOf(tree: FrameworkTree): SkillNode[] {
  return tree.blocks.filter((b) => b.active).flatMap((b) => b.competencies.flatMap(activeSkills));
}

export type Average = {
  /** Moyenne des notes connues, null si aucune note. */
  value: number | null;
  rated: number;
  /** Sous-compétences actives sans note (signalées « n non évaluées »). */
  unrated: number;
};

/** Moyenne d'une liste de sous-compétences (§6.2) : les sous-compétences non évaluées sont ignorées. */
export function averageOf(
  skills: SkillNode[],
  scoreOf: (skillId: string) => number | null,
): Average {
  const scores = skills.map((s) => scoreOf(s.id)).filter((v): v is number => v !== null);
  const value = scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  return { value, rated: scores.length, unrated: skills.length - scores.length };
}

/** Lecteur de note à partir d'une Map de dernières notes. */
export function scoreReader(scores: Map<string, { score: number }>) {
  return (skillId: string) => scores.get(skillId)?.score ?? null;
}

/**
 * % de maîtrise (§6.3) : sous-compétences actives dont la dernière note est ≥ 3, sur le nombre
 * de sous-compétences actives. Une sous-compétence jamais évaluée compte comme non maîtrisée.
 * Arrondi à l'entier ; null si le référentiel est vide.
 */
export function masteryPercent(tree: FrameworkTree, scores: Map<string, { score: number }>) {
  const skills = activeSkillsOf(tree);
  if (skills.length === 0) return null;
  const mastered = skills.filter((s) => isMastered(scores.get(s.id)?.score)).length;
  return Math.round((mastered / skills.length) * 100);
}

export type RadarPoint = {
  competencyId: string;
  label: string;
  block: string;
  current: number | null;
  previous: number | null;
  self: number | null;
};

/**
 * Données du radar : un axe par compétence active (moyenne de ses sous-compétences),
 * avec l'évaluation précédente et la dernière auto-évaluation en superposition.
 * (Choix de l'étape 3 : la matrice n'a que 2 blocs, un axe par bloc ne dirait rien.)
 */
export function radarData(tree: FrameworkTree, evaluations: EvaluationRecord[]): RadarPoint[] {
  const current = scoreReader(latestScores(evaluations));
  const previous = scoreReader(previousLatestScores(evaluations));
  const self = scoreReader(latestScores(evaluations, "self"));
  return tree.blocks
    .filter((b) => b.active)
    .flatMap((block) =>
      block.competencies
        .filter((c) => c.active && activeSkills(c).length > 0)
        .map((competency) => {
          const skills = activeSkills(competency);
          return {
            competencyId: competency.id,
            label: competency.name,
            block: block.name,
            current: averageOf(skills, current).value,
            previous: averageOf(skills, previous).value,
            self: averageOf(skills, self).value,
          };
        }),
    );
}

/** Moyenne affichée à 1 décimale, à la française (« 2,5 »). */
export function formatAverage(value: number | null): string {
  if (value === null) return "–";
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Avancement de la saisie d'une évaluation. */
export function evaluationProgress(tree: FrameworkTree, scores: Record<string, number | null>) {
  const skills = activeSkillsOf(tree);
  const rated = skills.filter((s) => scores[s.id] !== null && scores[s.id] !== undefined).length;
  return { rated, total: skills.length };
}

/** Qui peut modifier une évaluation (même règle que la base, pour l'affichage). */
export function canEditEvaluation(input: {
  kind: EvaluationKind;
  status: EvaluationStatus;
  isSubject: boolean;
  canManage: boolean;
  isAdmin: boolean;
}): boolean {
  if (input.status === "brouillon") {
    return input.kind === "manager" ? input.canManage : input.isSubject;
  }
  return input.kind === "manager" && input.isAdmin;
}
