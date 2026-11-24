import { describe, expect, it } from "vitest";

import { checkAiAccess, currentMonthStart, isAiPlan, monthlyLimit } from "@/lib/domain/ai-plan";

describe("options IA", () => {
  it("donne les limites de chaque option", () => {
    expect(monthlyLimit("aucune", "dojo")).toBe(0);
    expect(monthlyLimit("dojos", "dojo")).toBe(30);
    expect(monthlyLimit("dojos", "analyse_appel")).toBe(0);
    expect(monthlyLimit("pack_ia", "analyse_appel")).toBe(20);
  });

  it("refuse une fonction non comprise dans l'option", () => {
    const access = checkAiAccess("dojos", "analyse_appel", 0);
    expect(access.allowed).toBe(false);
    if (!access.allowed) expect(access.reason).toBe("non_inclus");
  });

  it("refuse au-delà du quota et compte ce qui reste", () => {
    expect(checkAiAccess("pack_ia", "analyse_appel", 19)).toEqual({ allowed: true, remaining: 1 });
    const full = checkAiAccess("pack_ia", "analyse_appel", 20);
    expect(full.allowed).toBe(false);
    if (!full.allowed) expect(full.reason).toBe("quota_atteint");
  });

  it("reconnaît les valeurs d'option", () => {
    expect(isAiPlan("pack_ia")).toBe(true);
    expect(isAiPlan("premium")).toBe(false);
  });

  it("calcule le début du mois à l'heure de Paris", () => {
    // 1er décembre à 0 h 30 à Paris = 30 novembre 23 h 30 UTC
    expect(currentMonthStart(new Date("2026-11-30T23:30:00Z"))).toBe("2026-11-30T23:00:00.000Z");
    expect(currentMonthStart(new Date("2026-07-15T10:00:00Z"))).toBe("2026-06-30T22:00:00.000Z");
  });
});
