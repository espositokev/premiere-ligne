import { describe, expect, it } from "vitest";

import { buildPrompt, extractJson, parseGeneration } from "@/lib/ai/dojo-generator";
import {
  canCreateDojo,
  canEditDojo,
  dojoChecklist,
  dojoContentSchema,
  emptyDojoContent,
  hasPlaceholders,
  parseDojoContent,
} from "@/lib/domain/dojo";

import example from "@/lib/ai/example-dojo.json";

describe("contenu d'un Dojo", () => {
  it("le Dojo de référence de la bibliothèque respecte le schéma et la méthode", () => {
    const content = dojoContentSchema.parse(example.content);
    expect(content.offline.scenarios).toHaveLength(3);
    expect(dojoChecklist(content).every((item) => item.ok)).toBe(true);
  });

  it("un Dojo vide prépare les 3 scénarios de difficulté croissante", () => {
    const content = emptyDojoContent();
    expect(content.offline.scenarios.map((s) => s.level)).toEqual([
      "debutant",
      "intermediaire",
      "avance",
    ]);
    expect(dojoChecklist(content).filter((item) => !item.ok).length).toBeGreaterThan(0);
  });

  it("un contenu abîmé donne un Dojo vide plutôt qu'une erreur", () => {
    expect(parseDojoContent("pas du json").offline.scenarios).toEqual([]);
    expect(parseDojoContent(null).theory.criteria).toEqual([]);
  });

  it("repère les zones à compléter d'un modèle", () => {
    const content = emptyDojoContent();
    expect(hasPlaceholders(content)).toBe(false);
    expect(hasPlaceholders({ ...content, objective: "Présenter [MODÈLE_1]" })).toBe(true);
  });
});

describe("droits sur les Dojos", () => {
  it("le responsable modifie tout, le manager ses propres Dojos, le commercial rien", () => {
    expect(canEditDojo("org_admin", "u1", { createdBy: null })).toBe(true);
    expect(canEditDojo("manager", "u1", { createdBy: "u1" })).toBe(true);
    expect(canEditDojo("manager", "u1", { createdBy: "u2" })).toBe(false);
    expect(canEditDojo("manager", "u1", { createdBy: null })).toBe(false);
    expect(canEditDojo("sales_rep", "u1", { createdBy: "u1" })).toBe(false);
    expect(canCreateDojo("sales_rep")).toBe(false);
    expect(canCreateDojo("manager")).toBe(true);
  });
});

describe("génération d'un Dojo", () => {
  it("le prompt contient le sujet, la sous-compétence et le Dojo de référence", () => {
    const prompt = buildPrompt({
      subject: "Relancer après un essai",
      skillName: "Personnaliser la relance",
      skillStatement: null,
      competencyName: "Next steps",
      organizationName: "Garage du Chay",
    });
    expect(prompt).toContain("Relancer après un essai");
    expect(prompt).toContain("Personnaliser la relance");
    expect(prompt).toContain(example.title);
  });

  it("lit une réponse entourée de texte ou de balises de code", () => {
    expect(extractJson('Voici :\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("rien")).toThrow();
  });

  it("accepte un Dojo complet et refuse une réponse incomplète", () => {
    const ok = parseGeneration(JSON.stringify({ title: "Relance", content: example.content }));
    expect(ok.ok).toBe(true);
    expect(parseGeneration(JSON.stringify({ content: example.content })).ok).toBe(false);
    expect(parseGeneration("pas de json").ok).toBe(false);
  });
});
