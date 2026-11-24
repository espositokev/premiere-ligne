import type { AiPlan, AiUsageKind } from "@/lib/supabase/types";

import { localToUtc, todayInZone } from "./coaching";

/**
 * Options IA payantes (DECISIONS.md, 24 novembre 2026).
 * - « Dojos à la demande » : 19 € HT par mois, 30 Dojos par mois.
 * - « Pack IA » : 45 € HT par mois, 20 analyses d'appels et 30 Dojos par mois.
 */
export const AI_PLANS = ["aucune", "dojos", "pack_ia"] as const satisfies readonly AiPlan[];

export const AI_PLAN_LABELS: Record<AiPlan, string> = {
  aucune: "Aucune option",
  dojos: "Dojos à la demande",
  pack_ia: "Pack IA",
};

export const AI_PLAN_PRICES: Record<AiPlan, string | null> = {
  aucune: null,
  dojos: "19 € HT par mois",
  pack_ia: "45 € HT par mois",
};

export const AI_USAGE_LABELS: Record<AiUsageKind, string> = {
  dojo: "Dojos générés",
  analyse_appel: "Appels analysés",
};

/** Nombre d'utilisations incluses par mois. 0 = fonction non comprise dans l'option. */
export const AI_MONTHLY_LIMITS: Record<AiPlan, Record<AiUsageKind, number>> = {
  aucune: { dojo: 0, analyse_appel: 0 },
  dojos: { dojo: 30, analyse_appel: 0 },
  pack_ia: { dojo: 30, analyse_appel: 20 },
};

export function isAiPlan(value: unknown): value is AiPlan {
  return typeof value === "string" && (AI_PLANS as readonly string[]).includes(value);
}

export function monthlyLimit(plan: AiPlan, kind: AiUsageKind): number {
  return AI_MONTHLY_LIMITS[plan][kind];
}

/** Premier instant (UTC, ISO) du mois en cours à l'heure de Paris. */
export function currentMonthStart(now: Date): string {
  const today = todayInZone(now);
  const start = localToUtc(`${today.slice(0, 8)}01T00:00`);
  if (!start) throw new Error("Date invalide");
  return start;
}

export type AiAccess =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: "non_inclus" | "quota_atteint"; message: string };

/** Peut-on lancer une utilisation IA de plus ce mois-ci ? */
export function checkAiAccess(plan: AiPlan, kind: AiUsageKind, usedThisMonth: number): AiAccess {
  const limit = monthlyLimit(plan, kind);
  if (limit === 0) {
    return {
      allowed: false,
      reason: "non_inclus",
      message:
        kind === "dojo"
          ? "La génération de Dojos par l'IA fait partie des options payantes. Contactez Première Ligne pour l'activer."
          : "L'analyse d'appels fait partie du Pack IA. Contactez Première Ligne pour l'activer.",
    };
  }
  if (usedThisMonth >= limit) {
    return {
      allowed: false,
      reason: "quota_atteint",
      message:
        kind === "dojo"
          ? `Les ${limit} Dojos du mois ont été générés. Le compteur repart à zéro le 1er du mois prochain.`
          : `Les ${limit} analyses d'appels du mois ont été utilisées. Le compteur repart à zéro le 1er du mois prochain.`,
    };
  }
  return { allowed: true, remaining: limit - usedThisMonth };
}
