import { describe, expect, it } from "vitest";

import {
  canDeleteAction,
  countOverdue,
  dueLabel,
  groupActions,
  isDueSoon,
  isOverdue,
  quickTransitions,
  type ActionStatus,
} from "@/lib/domain/actions";

const today = "2026-11-22";
const action = (
  id: string,
  status: ActionStatus,
  dueDate: string | null,
  createdAt = "2026-11-01T10:00:00Z",
) => ({
  id,
  status,
  dueDate,
  createdAt,
  doneAt: status === "faite" ? createdAt : null,
});

describe("retard (§6.6)", () => {
  it("échéance passée et action ouverte", () => {
    expect(isOverdue(action("a", "a_faire", "2026-11-21"), today)).toBe(true);
    expect(isOverdue(action("a", "en_cours", "2026-11-21"), today)).toBe(true);
    expect(isOverdue(action("a", "a_faire", "2026-11-22"), today)).toBe(false); // aujourd'hui : pas encore
    expect(isOverdue(action("a", "faite", "2026-11-01"), today)).toBe(false);
    expect(isOverdue(action("a", "abandonnee", "2026-11-01"), today)).toBe(false);
    expect(isOverdue(action("a", "a_faire", null), today)).toBe(false);
  });

  it("échéance proche sur 7 jours", () => {
    expect(isDueSoon(action("a", "a_faire", "2026-11-29"), today)).toBe(true);
    expect(isDueSoon(action("a", "a_faire", "2026-11-30"), today)).toBe(false);
    expect(isDueSoon(action("a", "faite", "2026-11-23"), today)).toBe(false);
  });

  it("compte les actions en retard", () => {
    expect(
      countOverdue(
        [
          action("a", "a_faire", "2026-11-01"),
          action("b", "faite", "2026-11-01"),
          action("c", "a_faire", null),
        ],
        today,
      ),
    ).toBe(1);
  });
});

describe("regroupement (§4.8)", () => {
  it("met le retard en tête et trie par échéance", () => {
    const groups = groupActions(
      [
        action("sans-date", "a_faire", null),
        action("tard", "a_faire", "2026-12-20"),
        action("tot", "a_faire", "2026-11-25"),
        action("retard", "en_cours", "2026-11-10"),
        action("cours", "en_cours", "2026-11-30"),
        action("vieux", "faite", null, "2026-10-01T10:00:00Z"),
        action("recent", "faite", null, "2026-11-20T10:00:00Z"),
        action("stop", "abandonnee", null),
      ],
      today,
    );
    expect(groups.overdue.map((a) => a.id)).toEqual(["retard"]);
    expect(groups.inProgress.map((a) => a.id)).toEqual(["cours"]);
    expect(groups.todo.map((a) => a.id)).toEqual(["tot", "tard", "sans-date"]);
    expect(groups.done.map((a) => a.id)).toEqual(["recent", "vieux"]);
    expect(groups.abandoned.map((a) => a.id)).toEqual(["stop"]);
  });
});

describe("règles d'interface", () => {
  it("propose les bons changements de statut", () => {
    expect(quickTransitions("a_faire")).toEqual(["en_cours", "faite"]);
    expect(quickTransitions("en_cours")).toEqual(["faite"]);
    expect(quickTransitions("faite")).toEqual(["a_faire"]);
  });

  it("applique les droits de suppression de la base", () => {
    expect(canDeleteAction({ source: "coaching", isSubject: true, canManage: false })).toBe(false);
    expect(canDeleteAction({ source: "manuelle", isSubject: true, canManage: false })).toBe(true);
    expect(canDeleteAction({ source: "coaching", isSubject: false, canManage: true })).toBe(true);
  });

  it("formule l'échéance", () => {
    expect(dueLabel(action("a", "a_faire", "2026-11-19"), today)).toBe("En retard de 3 jours");
    expect(dueLabel(action("a", "a_faire", "2026-11-21"), today)).toBe("En retard de 1 jour");
    expect(dueLabel(action("a", "a_faire", today), today)).toBe("Échéance aujourd'hui");
    expect(dueLabel(action("a", "a_faire", "2026-11-23"), today)).toBe("Échéance demain");
    expect(dueLabel(action("a", "a_faire", "2026-12-05"), today)).toBe("Échéance le 5 décembre");
    expect(dueLabel(action("a", "a_faire", null), today)).toBeNull();
  });
});

describe("comptes rendus à lire", () => {
  it("garde les CR clôturés depuis moins de 14 jours et pas encore commentés", async () => {
    const { reportsToRead } = await import("@/lib/domain/actions");
    const now = new Date("2026-11-22T12:00:00Z");
    const list = [
      { id: "a", status: "cloture", closedAt: "2026-11-20T10:00:00Z", repComment: null },
      { id: "b", status: "cloture", closedAt: "2026-11-21T10:00:00Z", repComment: "Merci" },
      { id: "c", status: "cloture", closedAt: "2026-10-01T10:00:00Z", repComment: null },
      { id: "d", status: "planifie", closedAt: null, repComment: null },
    ];
    expect(reportsToRead(list, now).map((c) => c.id)).toEqual(["a"]);
  });
});
