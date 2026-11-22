import { describe, expect, it } from "vitest";

import {
  averageMastery,
  closedPerMonth,
  coverageRate,
  repRows,
  reportsOnTimeRate,
  teamRadar,
  toCsv,
  weakestSkills,
  withoutCoaching,
} from "@/lib/domain/dashboard";
import type { EvaluationRecord } from "@/lib/domain/evaluation";
import type { FrameworkTree, SkillNode } from "@/lib/domain/framework";

const levels = { level_0: null, level_1: null, level_2: null, level_3: null, level_4: null };
const skill = (id: string): SkillNode => ({
  id,
  name: id.toUpperCase(),
  statement: null,
  position: 0,
  active: true,
  levels,
});
const tree: FrameworkTree = {
  id: "f",
  name: "Vente",
  blocks: [
    {
      id: "b",
      name: "Tunnel",
      position: 0,
      active: true,
      competencies: [
        {
          id: "c1",
          name: "Accueil",
          statement: null,
          position: 0,
          active: true,
          skills: [skill("s1"), skill("s2")],
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
  ],
};
const now = new Date("2026-11-22T12:00:00Z");
const evaluation = (
  subject: string,
  validatedAt: string,
  scores: Record<string, number | null>,
) => ({
  id: `${subject}-${validatedAt}`,
  subjectMembershipId: subject,
  kind: "manager" as const,
  status: "validee" as const,
  validatedAt,
  scores,
});
const evaluations = [
  evaluation("leo", "2026-11-01T10:00:00Z", { s1: 3, s2: 1, s3: 4 }),
  evaluation("ines", "2026-06-01T10:00:00Z", { s1: 1, s2: 1 }),
];
const reps = [
  { id: "leo", name: "Léo", teamId: "t1", teamName: "Nord" },
  { id: "ines", name: "Inès", teamId: "t1", teamName: "Nord" },
  { id: "tom", name: "Tom", teamId: "t2", teamName: "Sud" },
];
const coaching = (
  subject: string,
  scheduledAt: string,
  closedAt: string | null,
  coachName = "Julien",
) => ({
  subjectMembershipId: subject,
  coachName,
  status: closedAt ? ("cloture" as const) : ("planifie" as const),
  scheduledAt,
  durationMinutes: 120,
  closedAt,
});

describe("tableau de l'équipe", () => {
  const rows = repRows({
    reps,
    tree,
    evaluations,
    coachings: [
      coaching("leo", "2026-11-10T08:00:00Z", "2026-11-10T15:00:00Z"),
      coaching("ines", "2026-08-01T08:00:00Z", "2026-08-05T08:00:00Z"),
    ],
    actions: [{ subjectMembershipId: "leo", status: "a_faire", dueDate: "2026-11-01" }],
    now,
    today: "2026-11-22",
  });

  it("calcule une ligne par commercial", () => {
    expect(rows.map((r) => r.name)).toEqual(["Inès", "Léo", "Tom"]);
    const leo = rows.find((r) => r.id === "leo")!;
    expect(leo).toMatchObject({ mastery: 67, daysSinceCoaching: 12, overdueActions: 1 });
    expect(rows.find((r) => r.id === "tom")).toMatchObject({
      mastery: 0,
      daysSinceCoaching: null,
      lastEvaluatedAt: null,
    });
  });

  it("repère les commerciaux sans coaching depuis N jours, jamais coachés d'abord", () => {
    expect(withoutCoaching(rows, 45).map((r) => r.id)).toEqual(["tom", "ines"]);
  });

  it("calcule la couverture à 90 jours et la maîtrise moyenne", () => {
    expect(coverageRate(rows, now)).toBe(33);
    expect(averageMastery(rows)).toBe(22); // (0 + 67 + 0) / 3
    expect(coverageRate([], now)).toBeNull();
  });
});

describe("radar et points faibles de l'équipe (§6.2)", () => {
  const byRep = [
    evaluations.filter((e) => e.subjectMembershipId === "leo"),
    evaluations.filter((e) => e.subjectMembershipId === "ines"),
  ] as EvaluationRecord[][];

  it("fait la moyenne des moyennes des commerciaux", () => {
    const radar = teamRadar(tree, byRep);
    expect(radar[0]).toMatchObject({ label: "Accueil", current: 1.5 }); // Léo 2, Inès 1
    expect(radar[1]).toMatchObject({ label: "Découverte", current: 4 }); // Inès non évaluée : ignorée
  });

  it("classe les sous-compétences les plus faibles", () => {
    expect(weakestSkills(tree, byRep).map((s) => [s.skillId, s.average])).toEqual([
      ["s2", 1],
      ["s1", 2],
      ["s3", 4],
    ]);
  });
});

describe("coachings", () => {
  const list = [
    coaching("leo", "2026-11-10T08:00:00Z", "2026-11-10T15:00:00Z"),
    coaching("leo", "2026-11-01T08:00:00Z", "2026-11-06T08:00:00Z", "Sarah"),
    coaching("ines", "2026-10-01T08:00:00Z", "2026-10-02T09:00:00Z"),
    coaching("tom", "2026-11-25T08:00:00Z", null),
  ];

  it("compte les clôtures par mois et par coach", () => {
    const { coaches, rows } = closedPerMonth(list, now, 3);
    expect(coaches).toEqual(["Julien", "Sarah"]);
    expect(rows.map((r) => r.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(rows[2]).toMatchObject({ Julien: 1, Sarah: 1 });
    expect(rows[1]).toMatchObject({ Julien: 1, Sarah: 0 });
  });

  it("mesure les CR rédigés sous 48 h", () => {
    expect(reportsOnTimeRate(list, now)).toBe(67);
    expect(reportsOnTimeRate([], now)).toBeNull();
  });
});

describe("export CSV", () => {
  it("produit un fichier lisible par Excel", () => {
    const csv = toCsv(
      ["Nom", "Note"],
      [
        ['Léo; "Le pro"', 3],
        ["Inès", null],
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Léo; ""Le pro""";3');
    expect(csv).toContain("Inès;\r\n");
  });
});
