import "server-only";

import { dojoContentSchema, type DojoContent } from "@/lib/domain/dojo";

import example from "./example-dojo.json";

/**
 * Génération d'un Dojo selon la méthode Première Ligne, avec l'API Anthropic.
 * Le système connaît le standard « Créer un Dojo » (ci-dessous) et un Dojo de référence
 * de la bibliothèque : chaque Dojo généré suit exactement la même structure.
 */

export const DOJO_METHOD = `Tu es le concepteur pédagogique de Première Ligne, cabinet de formation des forces de vente
(« On forme là où ça se joue »). Tu crées des Dojos : des exercices d'entraînement terrain en 3 phases.

Méthode Première Ligne pour créer un Dojo :
1. Un Dojo cible UNE sous-compétence de la matrice : il répond toujours à un besoin identifié, jamais dans l'abstrait.
2. Phase 1 — Théorie : écrire le standard, c'est-à-dire le geste idéal parfaitement maîtrisé, en 3 à 6 étapes
   (chacune : un repère court, un titre, une description concrète, et « pourquoi » ça marche).
   Puis 4 à 6 critères d'excellence comportementaux et OBSERVABLES sur le terrain
   (pas « il est à l'aise » mais « il pose la question de closing sur 100 % de ses rendez-vous »),
   et 3 erreurs fréquentes à éviter.
3. Phase 2 — Offline (jeu de rôle hors situation réelle) : une notice manager en 4 étapes
   (préparer la séance, lancer le scénario, débriefer, fixer la prochaine étape), puis 3 scénarios
   de difficulté croissante : Débutant (situation simple, peu d'objections), Intermédiaire (client hésitant,
   1 à 2 obstacles), Avancé (situation complexe, objections fortes). Chaque scénario précise un objectif,
   une durée, le persona (profil, comportement, signal non verbal, motivation, frein), le contexte, l'enjeu,
   et ce que le manager observe. Les scénarios sont réalistes, jamais caricaturaux ni scolaires.
4. Phase 3 — Online (observation en situation réelle) : ce qu'il faut observer UNIQUEMENT, les points
   d'attention, une grille d'observation de 4 à 8 critères cochés Oui / Non / Partiel qui reprend EXACTEMENT
   les critères d'excellence de la phase 1 (ce qu'on enseigne est ce qu'on observe), et un guide de débriefing
   en 4 temps : auto-évaluation, retour sur les réussites avec un exemple précis, UN SEUL axe de travail
   prioritaire, engagement terrain sur un comportement (pas un résultat) avec une date de retour.
5. L'objectif est formulé du point de vue du commercial, comme un geste : « Le commercial sait… »,
   jamais « il comprend que ». Durée estimée : 20 à 45 minutes.
6. Ton : direct, concret, orienté terrain, tutoiement entre le manager et le commercial dans les répliques.
   Écris en français, sans jargon inutile.`;

export type GenerationInput = {
  subject: string;
  skillName: string;
  skillStatement: string | null;
  competencyName: string;
  organizationName: string;
};

export type GenerationResult =
  { ok: true; title: string; content: DojoContent } | { ok: false; error: string };

export function generationAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function buildPrompt(input: GenerationInput): string {
  return `Crée un Dojo complet pour l'entreprise « ${input.organizationName} ».

Sujet demandé par le manager : ${input.subject}
Compétence : ${input.competencyName}
Sous-compétence visée : ${input.skillName}${input.skillStatement ? ` — « ${input.skillStatement} »` : ""}

Voici un Dojo de référence de la bibliothèque Première Ligne. Reprends EXACTEMENT la même structure JSON,
le même niveau de détail et le même style, mais avec un contenu entièrement adapté au sujet demandé :

${JSON.stringify(example)}

Réponds uniquement par un objet JSON de la forme {"title": "...", "content": {...}}, sans texte autour.`;
}

/** Extrait l'objet JSON d'une réponse, même entourée de texte ou de balises de code. */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Aucun JSON dans la réponse");
  return JSON.parse(raw.slice(start, end + 1));
}

export function parseGeneration(raw: string): GenerationResult {
  try {
    const value = extractJson(raw) as { title?: unknown; content?: unknown };
    const content = dojoContentSchema.safeParse(value.content);
    if (!content.success || typeof value.title !== "string" || !value.title.trim()) {
      return { ok: false, error: "Le Dojo généré est incomplet. Réessayez." };
    }
    return { ok: true, title: value.title.trim().slice(0, 140), content: content.data };
  } catch {
    return { ok: false, error: "Le Dojo généré n'a pas pu être lu. Réessayez." };
  }
}

export async function generateDojo(input: GenerationInput): Promise<GenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "La génération de Dojos n'est pas encore activée sur cette plateforme.",
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
        max_tokens: 8000,
        system: DOJO_METHOD,
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json()) as {
      content?: { type: string; text?: string }[];
      error?: { message?: string };
    };
    if (!response.ok) {
      console.error("[génération] API", response.status, body.error?.message);
      return {
        ok: false,
        error: "Le service de génération ne répond pas. Réessayez dans un instant.",
      };
    }
    const text = (body.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("");
    return parseGeneration(text);
  } catch (error) {
    console.error("[génération]", error);
    return { ok: false, error: "La génération a pris trop de temps. Réessayez." };
  }
}
