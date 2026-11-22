/** Arborescence d'un référentiel : Bloc → Compétence → Sous-compétence notée (§4.4). */

export type LevelKey = "level_0" | "level_1" | "level_2" | "level_3" | "level_4";
export const LEVEL_KEYS: LevelKey[] = ["level_0", "level_1", "level_2", "level_3", "level_4"];

export type SkillNode = {
  id: string;
  name: string;
  statement: string | null;
  position: number;
  active: boolean;
  levels: Record<LevelKey, string | null>;
};

export type CompetencyNode = {
  id: string;
  name: string;
  statement: string | null;
  position: number;
  active: boolean;
  skills: SkillNode[];
};

export type BlockNode = {
  id: string;
  name: string;
  position: number;
  active: boolean;
  competencies: CompetencyNode[];
};

export type FrameworkTree = { id: string; name: string; blocks: BlockNode[] };

export type NodeKind = "block" | "competency" | "skill";

export const NODE_LABELS: Record<NodeKind, { one: string; add: string }> = {
  block: { one: "bloc", add: "Ajouter un bloc" },
  competency: { one: "compétence", add: "Ajouter une compétence" },
  skill: { one: "sous-compétence", add: "Ajouter une sous-compétence" },
};

/** Trie par position puis par nom, pour un ordre stable même si deux positions sont égales. */
export function byPosition<T extends { position: number; name: string }>(a: T, b: T): number {
  return a.position - b.position || a.name.localeCompare(b.name, "fr");
}

/**
 * Nouvel ordre d'une liste après avoir monté ou descendu un élément.
 * Renvoie les positions à écrire (0, 1, 2…), ou null si l'élément est déjà en bout de liste.
 */
export function reorder<T extends { id: string; position: number; name: string }>(
  siblings: T[],
  id: string,
  direction: "up" | "down",
): { id: string; position: number }[] | null {
  const sorted = [...siblings].sort(byPosition);
  const index = sorted.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return null;
  const moved = [...sorted];
  const [item] = moved.splice(index, 1);
  if (!item) return null;
  moved.splice(target, 0, item);
  return moved
    .map((entry, position) => ({ id: entry.id, position, changed: entry.position !== position }))
    .filter((entry) => entry.changed)
    .map(({ id: entryId, position }) => ({ id: entryId, position }));
}

/** Comptes affichés en tête d'éditeur. */
export function countTree(tree: FrameworkTree, includeInactive = false) {
  const blocks = tree.blocks.filter((b) => includeInactive || b.active);
  const competencies = blocks
    .flatMap((b) => b.competencies)
    .filter((c) => includeInactive || c.active);
  const skills = competencies.flatMap((c) => c.skills).filter((s) => includeInactive || s.active);
  return { blocks: blocks.length, competencies: competencies.length, skills: skills.length };
}
