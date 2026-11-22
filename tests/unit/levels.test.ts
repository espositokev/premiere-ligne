import { describe, expect, it } from "vitest";

import { isMastered, isScore, levelTone } from "@/lib/domain/levels";

describe("levelTone (§6.4)", () => {
  it.each([
    [0, "low"],
    [1, "low"],
    [2, "mid"],
    [3, "good"],
    [4, "expert"],
  ] as const)("la note %i est de tonalité %s", (score, tone) => {
    expect(levelTone(score)).toBe(tone);
  });

  it("une compétence non évaluée est grise", () => {
    expect(levelTone(null)).toBe("none");
    expect(levelTone(undefined)).toBe("none");
  });

  it("refuse une note hors de 0 à 4", () => {
    expect(() => levelTone(5)).toThrow(RangeError);
    expect(() => levelTone(-1)).toThrow(RangeError);
    expect(() => levelTone(2.5)).toThrow(RangeError);
  });
});

describe("isScore", () => {
  it("n'accepte que les entiers de 0 à 4", () => {
    expect([0, 1, 2, 3, 4].every(isScore)).toBe(true);
    expect([5, -1, 1.5, "3", null].some(isScore)).toBe(false);
  });
});

describe("isMastered (§6.3)", () => {
  it("une compétence est maîtrisée à partir de 3", () => {
    expect(isMastered(3)).toBe(true);
    expect(isMastered(4)).toBe(true);
    expect(isMastered(2)).toBe(false);
  });

  it("une compétence jamais évaluée compte comme non maîtrisée", () => {
    expect(isMastered(null)).toBe(false);
  });
});
