import { describe, expect, it } from "vitest";

import {
  actionPlanSchema,
  buildIcs,
  canClose,
  daysSinceEnd,
  displayStatus,
  groupCoachings,
  localToUtc,
  parseActionPlan,
  reminderDue,
  shiftDays,
  todayInZone,
  utcToLocalInput,
  weekDays,
  weekStart,
} from "@/lib/domain/coaching";

const now = new Date("2026-11-22T12:00:00Z");
const coaching = (scheduledAt: string, status: "planifie" | "cloture" | "annule" = "planifie") => ({
  status,
  scheduledAt,
  durationMinutes: 120,
});

describe("statut calculé (§6.5)", () => {
  it("passe « à rédiger » une fois la fin passée", () => {
    expect(displayStatus(coaching("2026-11-23T09:00:00Z"), now)).toBe("planifie");
    expect(displayStatus(coaching("2026-11-22T11:00:00Z"), now)).toBe("planifie"); // en cours
    expect(displayStatus(coaching("2026-11-22T09:00:00Z"), now)).toBe("a_rediger");
    expect(displayStatus(coaching("2026-11-20T09:00:00Z", "cloture"), now)).toBe("cloture");
    expect(displayStatus(coaching("2026-11-20T09:00:00Z", "annule"), now)).toBe("annule");
  });

  it("autorise la clôture dès que le coaching a commencé", () => {
    expect(canClose(coaching("2026-11-22T11:00:00Z"), now)).toBe(true);
    expect(canClose(coaching("2026-11-23T09:00:00Z"), now)).toBe(false);
    expect(canClose(coaching("2026-11-20T09:00:00Z", "cloture"), now)).toBe(false);
  });

  it("compte les jours depuis la fin", () => {
    expect(daysSinceEnd(coaching("2026-11-19T09:00:00Z"), now)).toBe(3);
    expect(daysSinceEnd(coaching("2026-11-23T09:00:00Z"), now)).toBe(0);
  });
});

describe("rappel de compte rendu", () => {
  it("attend 48 h après la fin, puis une semaine entre deux rappels", () => {
    const base = coaching("2026-11-19T09:00:00Z");
    expect(reminderDue({ ...base, reminderSentAt: null }, now)).toBe(true);
    expect(reminderDue({ ...coaching("2026-11-21T09:00:00Z"), reminderSentAt: null }, now)).toBe(
      false,
    );
    expect(reminderDue({ ...base, reminderSentAt: "2026-11-20T12:00:00Z" }, now)).toBe(false);
    expect(reminderDue({ ...base, reminderSentAt: "2026-11-15T12:00:00Z" }, now)).toBe(true);
    expect(
      reminderDue({ ...coaching("2026-11-10T09:00:00Z", "cloture"), reminderSentAt: null }, now),
    ).toBe(false);
  });
});

describe("page Coachings", () => {
  it("répartit et trie", () => {
    const groups = groupCoachings(
      [
        { ...coaching("2026-11-25T09:00:00Z"), id: "futur2" },
        { ...coaching("2026-11-24T09:00:00Z"), id: "futur1" },
        { ...coaching("2026-11-20T09:00:00Z"), id: "rediger-recent" },
        { ...coaching("2026-11-10T09:00:00Z"), id: "rediger-ancien" },
        {
          ...coaching("2026-11-01T09:00:00Z", "cloture"),
          id: "clos",
          closedAt: "2026-11-02T09:00:00Z",
        },
        { ...coaching("2026-11-01T09:00:00Z", "annule"), id: "annule" },
      ],
      now,
    );
    expect(groups.toWrite.map((c) => c.id)).toEqual(["rediger-ancien", "rediger-recent"]);
    expect(groups.upcoming.map((c) => c.id)).toEqual(["futur1", "futur2"]);
    expect(groups.closed.map((c) => c.id)).toEqual(["clos"]);
    expect(groups.cancelled.map((c) => c.id)).toEqual(["annule"]);
  });
});

describe("plan d'action", () => {
  it("valide les actions et ignore les entrées abîmées", () => {
    expect(actionPlanSchema.safeParse([{ title: "Relancer 5 clients" }]).success).toBe(true);
    expect(actionPlanSchema.safeParse([{ title: " " }]).success).toBe(false);
    expect(parseActionPlan([{ title: "OK", dueDate: "2026-12-01" }, { nope: 1 }, "x"])).toEqual([
      { title: "OK", description: null, skillId: null, dueDate: "2026-12-01" },
    ]);
    expect(parseActionPlan(null)).toEqual([]);
  });
});

describe("heure de Paris", () => {
  it("convertit l'heure saisie en UTC, été comme hiver", () => {
    expect(localToUtc("2026-11-25T09:30")).toBe("2026-11-25T08:30:00.000Z");
    expect(localToUtc("2026-07-01T09:30")).toBe("2026-07-01T07:30:00.000Z");
    expect(localToUtc("pas une date")).toBeNull();
  });

  it("revient à l'heure de Paris pour le formulaire", () => {
    expect(utcToLocalInput("2026-11-25T08:30:00.000Z")).toBe("2026-11-25T09:30");
    expect(utcToLocalInput("2026-07-01T07:30:00.000Z")).toBe("2026-07-01T09:30");
    expect(todayInZone(new Date("2026-11-22T23:30:00Z"))).toBe("2026-11-23");
  });

  it("calcule les semaines du lundi au dimanche", () => {
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // dimanche → lundi précédent
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekDays("2026-11-23")).toHaveLength(7);
    expect(weekDays("2026-11-23")[6]).toBe("2026-11-29");
    expect(shiftDays("2026-11-30", 7)).toBe("2026-12-07");
  });
});

describe("invitation agenda", () => {
  it("produit un événement valide et échappe le texte", () => {
    const ics = buildIcs({
      uid: "abc",
      start: "2026-11-25T08:30:00.000Z",
      durationMinutes: 90,
      title: "Coaching terrain, avec Julien",
      location: "Concession; Bordeaux",
      now,
    });
    expect(ics).toContain("DTSTART:20261125T083000Z");
    expect(ics).toContain("DTEND:20261125T100000Z");
    expect(ics).toContain("SUMMARY:Coaching terrain\\, avec Julien");
    expect(ics).toContain("LOCATION:Concession\\; Bordeaux");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
    expect(
      buildIcs({
        uid: "x",
        start: "2026-11-25T08:30:00Z",
        durationMinutes: 60,
        title: "t",
        cancelled: true,
        now,
      }),
    ).toContain("STATUS:CANCELLED");
  });
});

describe("affichage des dates", () => {
  it("affiche l'heure de Paris", async () => {
    const { formatWhen, formatTimeRange } = await import("@/lib/domain/coaching");
    expect(formatWhen("2026-11-25T08:30:00Z")).toBe("mercredi 25 novembre à 9 h 30");
    expect(formatTimeRange("2026-11-25T08:30:00Z", 90)).toBe("9 h 30 – 11 h 00");
  });
});
