/**
 * Niveaux de compétence (§4.4) et leur code couleur (§6.4).
 * Fonctions pures : aucune dépendance à React ni à Supabase.
 */

export const SCORE_VALUES = [0, 1, 2, 3, 4] as const;
export type Score = (typeof SCORE_VALUES)[number];

/** Catégorie visuelle d'une note : 0-1 rouge, 2 orange, 3 vert, 4 bleu, null gris. */
export type LevelTone = "low" | "mid" | "good" | "expert" | "none";

export function isScore(value: unknown): value is Score {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
}

export function levelTone(score: number | null | undefined): LevelTone {
  if (score === null || score === undefined) return "none";
  if (!isScore(score)) {
    throw new RangeError(`Note invalide : ${score}. Une note va de 0 à 4.`);
  }
  if (score <= 1) return "low";
  if (score === 2) return "mid";
  if (score === 3) return "good";
  return "expert";
}

/** Une compétence est maîtrisée à partir de 3 (§6.3). */
export function isMastered(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && score >= 3;
}
