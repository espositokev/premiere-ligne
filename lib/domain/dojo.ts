import { z } from "zod";

/**
 * Contenu d'un Dojo, selon le standard Première Ligne « Créer un Dojo » :
 * Phase 1 Théorie (standard, critères d'excellence, erreurs), Phase 2 Offline (notice manager,
 * 3 scénarios de difficulté croissante), Phase 3 Online (grille d'observation qui reprend
 * exactement les critères, guide de débriefing).
 * Les sections libres (`sections`) accueillent les Dojos du kit dont la mise en page sort du standard.
 */

const text = z.string().trim();
const optionalText = text
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));
const list = z.array(text.min(1)).default([]);

export const DOJO_LEVELS = ["debutant", "intermediaire", "avance"] as const;
export const DOJO_LEVEL_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

const titled = z.object({ title: text.min(1), description: text.default("") });

const sectionSchema = z.object({
  title: text.min(1),
  intro: optionalText,
  items: z
    .array(z.object({ title: text, description: text.default(""), example: optionalText }))
    .optional(),
  lines: z.array(text).optional(),
});

const scenarioSchema = z.object({
  level: text.default("debutant"),
  title: text.min(1),
  objective: optionalText,
  duration: optionalText,
  persona: z.array(z.object({ label: text, text: text })).default([]),
  context: optionalText,
  stakes: optionalText,
  observe: list,
});

export const dojoContentSchema = z.object({
  version: z.literal(1).default(1),
  tagline: optionalText,
  objective: optionalText,
  duration: optionalText,
  theory: z
    .object({
      intro: optionalText,
      standardTitle: optionalText,
      standard: z
        .array(
          z.object({
            label: optionalText,
            title: text.min(1),
            description: text.default(""),
            why: optionalText,
          }),
        )
        .default([]),
      criteria: z.array(titled).default([]),
      mistakes: z.array(titled).default([]),
      sections: z.array(sectionSchema).default([]),
    })
    .default({
      intro: null,
      standardTitle: null,
      standard: [],
      criteria: [],
      mistakes: [],
      sections: [],
    }),
  offline: z
    .object({
      guide: z.array(titled).default([]),
      scenarios: z.array(scenarioSchema).default([]),
    })
    .default({ guide: [], scenarios: [] }),
  online: z
    .object({
      focus: optionalText,
      attentionPoints: list,
      grid: list,
      debrief: z.array(z.object({ title: text.min(1), prompt: text.default("") })).default([]),
      sections: z.array(sectionSchema).default([]),
    })
    .default({ focus: null, attentionPoints: [], grid: [], debrief: [], sections: [] }),
  takeaways: z
    .object({
      theory: optionalText,
      offline: optionalText,
      online: optionalText,
      next: optionalText,
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  hasPlaceholders: z.boolean().optional(),
});

export type DojoContent = z.infer<typeof dojoContentSchema>;
export type DojoScenario = DojoContent["offline"]["scenarios"][number];

export type DojoStatus = "brouillon" | "a_tester" | "valide" | "archive";
export type DojoSource = "bibliotheque" | "ia" | "manuel";

export const DOJO_STATUS_LABELS: Record<DojoStatus, string> = {
  brouillon: "Brouillon",
  a_tester: "À tester",
  valide: "Validé",
  archive: "Archivé",
};

export const DOJO_SOURCE_LABELS: Record<DojoSource, string> = {
  bibliotheque: "Bibliothèque Première Ligne",
  ia: "Généré",
  manuel: "Créé par l'équipe",
};

/** Lecture tolérante d'un contenu stocké : un JSON abîmé donne un Dojo vide plutôt qu'une erreur. */
export function parseDojoContent(value: unknown): DojoContent {
  const parsed = dojoContentSchema.safeParse(value);
  return parsed.success ? parsed.data : dojoContentSchema.parse({});
}

export function emptyDojoContent(): DojoContent {
  return dojoContentSchema.parse({
    offline: {
      scenarios: DOJO_LEVELS.map((level) => ({ level, title: DOJO_LEVEL_LABELS[level] ?? level })),
    },
  });
}

/** Points de contrôle du standard « Créer un Dojo » : ce qui manque avant de passer « à tester ». */
export function dojoChecklist(content: DojoContent) {
  const criteria = content.theory.criteria.length;
  return [
    { ok: Boolean(content.objective), label: "Un objectif formulé comme un geste du commercial" },
    { ok: criteria >= 4 && criteria <= 6, label: "4 à 6 critères d'excellence observables" },
    {
      ok: content.offline.scenarios.length >= 3,
      label: "3 scénarios Offline de difficulté croissante",
    },
    {
      ok: content.online.grid.length >= 4 && content.online.grid.length <= 8,
      label: "Une grille d'observation Online de 4 à 8 critères",
    },
  ];
}

/** Repère les zones à compléter laissées dans un modèle (ex. [MODÈLE_1]). */
export function hasPlaceholders(content: DojoContent): boolean {
  return /\[[A-ZÀ-Ü_0-9]{3,}\]/.test(JSON.stringify(content));
}

/** Droits d'édition (miroir des règles de la base, pour l'affichage des boutons). */
export function canEditDojo(
  role: "super_admin" | "org_admin" | "manager" | "sales_rep",
  userId: string,
  dojo: { createdBy: string | null },
): boolean {
  if (role === "super_admin" || role === "org_admin") return true;
  return role === "manager" && dojo.createdBy === userId;
}

export function canCreateDojo(
  role: "super_admin" | "org_admin" | "manager" | "sales_rep",
): boolean {
  return role !== "sales_rep";
}

export const DOJO_PHASES = [
  { key: "theorie", number: 1, label: "Théorie", hint: "Le standard, le geste idéal" },
  { key: "offline", number: 2, label: "Offline", hint: "Jeu de rôle hors situation réelle" },
  { key: "online", number: 3, label: "Online", hint: "Observation en rendez-vous client" },
] as const;
export type DojoPhase = (typeof DOJO_PHASES)[number]["key"];
