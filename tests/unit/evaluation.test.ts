import { describe, expect, it } from "vitest";

import {
  averageOf,
  canEditEvaluation,
  evaluationProgress,
  formatAverage,
  latestScores,
  masteryPercent,
  previousLatestScores,
  radarData,
  scoreReader,
  trend,
  type EvaluationRecord,
} from "@/lib/domain/evaluation";
import type { FrameworkTree, SkillNode } from "@/lib/domain/framework";

const levels = { level_0: null, level_1: null, level_2: null, level_3: null, level_4: null };
const skill = (id: string, active = true): SkillNode => ({
  id,
  name: id,
  statement: null,
  position: 0,
  active,
  levels,
});

const tree: FrameworkTree = {
  id: "f",
  name: "Vente",
  blocks: [
    {
      id: "b1",
      name: "Tunnel de vente",
      position: 0,
      active: true,
      competencies: [
        {
          id: "c1",
          name: "Accueil",
          statement: null,
          position: 0,
          active: true,
          skills: [skill("s1"), skill("s2"), skill("off", false)],
        },
        {
          id: "c2",
          name: "Découverte",
          statement: null,
          position: 1,
          active: true,
          skills: [skill("s3")],
        },
      ],
    },
    {
      id: "b2",
      name: "Transversal",
      position: 1,
      active: false,
      competencies: [
        {
          id: "c3",
          name: "Organisation",
          statement: null,
          position: 0,
          active: true,
          skills: [skill("s4")],
        },
      ],
    },
  ],
};

const evaluation = (
  id: string,
  validatedAt: string | null,
  scores: Record<string, number | null>,
  kind: "manager" | "self" = "manager",
): EvaluationRecord => ({
  id,
  kind,
  status: validatedAt ? "validee" : "brouillon",
  validatedAt,
  scores,
});

const history = [
  evaluation("e1", "2026-09-01T10:00:00Z", { s1: 1, s2: 2, s3: null }),
  evaluation("e2", "2026-11-01T10:00:00Z", { s1: 3, s3: 4 }),
  evaluation("self", "2026-11-05T10:00:00Z", { s1: 4, s2: 4 }, "self"),
  evaluation("draft", null, { s1: 0, s2: 0, s3: 0 }),
];

describe("dernière note (§6.1)", () => {
  const latest = latestScores(history);

  it("prend la dernière évaluation manager validée qui note la sous-compétence", () => {
    expect(latest.get("s1")).toMatchObject({ score: 3, previousScore: 1, evaluationId: "e2" });
    expect(latest.get("s2")).toMatchObject({ score: 2, previousScore: null, evaluationId: "e1" });
    expect(latest.get("s3")).toMatchObject({ score: 4, previousScore: null });
  });

  it("ignore les brouillons et les auto-évaluations", () => {
    expect(latest.get("s1")?.score).not.toBe(0);
    expect(latest.get("s1")?.score).not.toBe(4);
  });

  it("donne la dernière auto-évaluation à part", () => {
    expect(latestScores(history, "self").get("s1")?.score).toBe(4);
  });

  it("donne l'état d'avant la dernière évaluation, pour le radar", () => {
    const previous = previousLatestScores(history);
    expect(previous.get("s1")?.score).toBe(1);
    expect(previous.get("s3")).toBeUndefined();
    expect(previousLatestScores([]).size).toBe(0);
  });
});

describe("évolution", () => {
  it("indique ↑ ↓ = ou rien", () => {
    expect(trend(3, 1)).toBe("up");
    expect(trend(1, 3)).toBe("down");
    expect(trend(2, 2)).toBe("same");
    expect(trend(2, null)).toBeNull();
    expect(trend(null, 2)).toBeNull();
  });
});

describe("moyennes et radar (§6.2)", () => {
  it("ignore les sous-compétences non évaluées et les compte", () => {
    const average = averageOf([skill("s1"), skill("s2"), skill("x")], (id) =>
      id === "s1" ? 3 : id === "s2" ? 2 : null,
    );
    expect(average).toEqual({ value: 2.5, rated: 2, unrated: 1 });
    expect(averageOf([skill("x")], () => null).value).toBeNull();
  });

  it("affiche une décimale à la française", () => {
    expect(formatAverage(2.5)).toBe("2,5");
    expect(formatAverage(3)).toBe("3,0");
    expect(formatAverage(2.25)).toBe("2,3");
    expect(formatAverage(null)).toBe("–");
  });

  it("trace un axe par compétence active, avec précédent et auto-évaluation", () => {
    const points = radarData(tree, history);
    expect(points.map((p) => p.label)).toEqual(["Accueil", "Découverte"]);
    expect(points[0]).toMatchObject({ current: 2.5, previous: 1.5, self: 4 });
    expect(points[1]).toMatchObject({ current: 4, previous: null, self: null });
  });
});

describe("% de maîtrise (§6.3)", () => {
  it("compte les jamais évaluées comme non maîtrisées et ignore les inactives", () => {
    // Actives : s1 (3), s2 (2), s3 (4) → 2 maîtrisées sur 3.
    expect(masteryPercent(tree, latestScores(history))).toBe(67);
    expect(masteryPercent(tree, new Map())).toBe(0);
    expect(masteryPercent({ id: "x", name: "x", blocks: [] }, new Map())).toBeNull();
  });

  it("lit une note dans une Map", () => {
    const read = scoreReader(new Map([["s1", { score: 2 }]]));
    expect(read("s1")).toBe(2);
    expect(read("s9")).toBeNull();
  });
});

describe("saisie", () => {
  it("compte les sous-compétences actives notées", () => {
    expect(evaluationProgress(tree, { s1: 2, s2: null, off: 4, s4: 1 })).toEqual({
      rated: 1,
      total: 3,
    });
  });

  it("applique les mêmes droits que la base", () => {
    const base = { isSubject: false, canManage: true, isAdmin: false };
    expect(canEditEvaluation({ ...base, kind: "manager", status: "brouillon" })).toBe(true);
    expect(canEditEvaluation({ ...base, kind: "manager", status: "validee" })).toBe(false);
    expect(canEditEvaluation({ ...base, isAdmin: true, kind: "manager", status: "validee" })).toBe(
      true,
    );
    expect(canEditEvaluation({ ...base, kind: "self", status: "brouillon" })).toBe(false);
    expect(canEditEvaluation({ ...base, isSubject: true, kind: "self", status: "brouillon" })).toBe(
      true,
    );
    expect(canEditEvaluation({ ...base, isSubject: true, kind: "self", status: "validee" })).toBe(
      false,
    );
  });
});
