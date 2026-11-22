import "server-only";

import {
  activeSkills,
  latestScores,
  masteryPercent,
  radarData,
  validatedOfKind,
} from "@/lib/domain/evaluation";
import type { FrameworkTree } from "@/lib/domain/framework";

import { listEvaluations } from "./evaluations";
import { loadOrganizationTree } from "./framework";

/** Tout ce qu'il faut pour afficher la progression d'un commercial (fiche et « Ma progression »). */
export async function loadProgress(organizationId: string, memberId: string) {
  const [framework, evaluations] = await Promise.all([
    loadOrganizationTree(organizationId),
    listEvaluations(memberId),
  ]);
  const tree: FrameworkTree = framework?.tree ?? { id: "", name: "", blocks: [] };
  const latest = latestScores(evaluations);
  const self = latestScores(evaluations, "self");
  const [lastManager] = validatedOfKind(evaluations, "manager");
  return {
    hasFramework: framework !== null,
    tree,
    evaluations,
    latest,
    self,
    radar: radarData(tree, evaluations),
    mastery: masteryPercent(tree, latest),
    lastEvaluatedAt: lastManager?.validatedAt ?? null,
    managerDraft: evaluations.find((e) => e.kind === "manager" && e.status === "brouillon") ?? null,
    selfDraft: evaluations.find((e) => e.kind === "self" && e.status === "brouillon") ?? null,
  };
}

/** Référentiel réduit aux éléments actifs, pour l'écran de saisie. */
export function editorBlocks(tree: FrameworkTree) {
  return tree.blocks
    .filter((b) => b.active)
    .map((b) => ({
      id: b.id,
      name: b.name,
      competencies: b.competencies
        .filter((c) => c.active && activeSkills(c).length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          skills: activeSkills(c).map((s) => ({
            id: s.id,
            name: s.name,
            statement: s.statement,
            levels: [
              s.levels.level_0,
              s.levels.level_1,
              s.levels.level_2,
              s.levels.level_3,
              s.levels.level_4,
            ],
          })),
        })),
    }))
    .filter((b) => b.competencies.length > 0);
}

/** Date courte, pour les indicateurs (« 10 nov. 2026 »). */
export function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
