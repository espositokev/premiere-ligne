/**
 * Paramètres d'une entreprise (§6.8), stockés dans organizations.settings (JSON).
 * Toute valeur absente ou invalide retombe sur sa valeur par défaut.
 */

import { z } from "zod";

export const orgSettingsSchema = z.object({
  /** « Sans coaching depuis N jours » sur les tableaux de bord. */
  daysWithoutCoaching: z.coerce.number().int().min(7).max(365).catch(45).default(45),
  /** Les commerciaux peuvent s'auto-évaluer. */
  allowSelfEvaluation: z.boolean().catch(true).default(true),
  /** Les commerciaux peuvent demander un coaching. */
  allowCoachingRequests: z.boolean().catch(true).default(true),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export const DEFAULT_SETTINGS: OrgSettings = orgSettingsSchema.parse({});

export function parseSettings(value: unknown): OrgSettings {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return orgSettingsSchema.parse(base);
}
