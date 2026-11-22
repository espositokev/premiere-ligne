import { describe, expect, it } from "vitest";

import { invitationExpiry, invitationState } from "@/lib/domain/invitations";
import { homePathFor, isNavItemActive, orgNavigation } from "@/lib/domain/navigation";
import { safeNextPath } from "@/lib/domain/redirects";
import { canAdministerOrg, invitableRoles } from "@/lib/domain/roles";
import { slugify } from "@/lib/domain/slug";

describe("slugify", () => {
  it("transforme un nom en adresse lisible", () => {
    expect(slugify("Garage du Chay")).toBe("garage-du-chay");
    expect(slugify("  Écoles & Formations — Royan ")).toBe("ecoles-et-formations-royan");
    expect(slugify("L'Atelier 17")).toBe("l-atelier-17");
  });

  it("ne produit jamais de tiret en début ou fin, ni plus de 60 caractères", () => {
    const slug = slugify(`--${"a".repeat(80)}--`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("rôles (§2.2)", () => {
  it("seuls le super admin et le responsable administrent l'entreprise", () => {
    expect(canAdministerOrg("super_admin")).toBe(true);
    expect(canAdministerOrg("org_admin")).toBe(true);
    expect(canAdministerOrg("manager")).toBe(false);
    expect(canAdministerOrg("sales_rep")).toBe(false);
  });

  it("un manager ne peut inviter que des commerciaux, un commercial personne", () => {
    expect(invitableRoles("manager")).toEqual(["sales_rep"]);
    expect(invitableRoles("sales_rep")).toEqual([]);
    expect(invitableRoles("org_admin")).toContain("manager");
  });
});

describe("invitations (§3.2)", () => {
  const now = new Date("2026-11-22T12:00:00Z");

  it("expire au bout de 7 jours", () => {
    expect(invitationExpiry(now).toISOString()).toBe("2026-11-29T12:00:00.000Z");
  });

  it("calcule l'état d'une invitation", () => {
    const base = { accepted_at: null, revoked_at: null, expires_at: "2026-11-25T00:00:00Z" };
    expect(invitationState(base, now)).toBe("en_attente");
    expect(invitationState({ ...base, expires_at: "2026-11-20T00:00:00Z" }, now)).toBe("expiree");
    expect(invitationState({ ...base, revoked_at: "2026-11-21T00:00:00Z" }, now)).toBe("annulee");
    expect(
      invitationState({ ...base, accepted_at: "2026-11-21T00:00:00Z", revoked_at: "x" }, now),
    ).toBe("acceptee");
  });
});

describe("navigation", () => {
  it("affiche au plus 4 entrées pour chaque rôle (barre d'onglets mobile)", () => {
    for (const role of ["super_admin", "org_admin", "manager", "sales_rep"] as const) {
      expect(orgNavigation("acme", role).length).toBeLessThanOrEqual(4);
    }
  });

  it("le commercial n'a pas accès aux paramètres", () => {
    const hrefs = orgNavigation("acme", "sales_rep").map((i) => i.href);
    expect(hrefs.some((h) => h.includes("parametres"))).toBe(false);
  });

  it("repère l'onglet actif, y compris sur une sous-page", () => {
    expect(isNavItemActive({ href: "/e/acme", exact: true }, "/e/acme/equipe")).toBe(false);
    expect(isNavItemActive({ href: "/e/acme/equipe" }, "/e/acme/equipe")).toBe(true);
    expect(
      isNavItemActive(
        { href: "/e/acme/parametres/utilisateurs" },
        "/e/acme/parametres/utilisateurs/123",
      ),
    ).toBe(true);
  });

  it("envoie chacun vers la bonne page après connexion", () => {
    expect(homePathFor({ isSuperAdmin: true, spaces: [] })).toBe("/admin");
    expect(homePathFor({ isSuperAdmin: false, spaces: [] })).toBe("/espaces");
    expect(
      homePathFor({ isSuperAdmin: false, spaces: [{ slug: "acme", role: "sales_rep" }] }),
    ).toBe("/e/acme/moi");
    expect(homePathFor({ isSuperAdmin: false, spaces: [{ slug: "acme", role: "manager" }] })).toBe(
      "/e/acme",
    );
    expect(
      homePathFor({
        isSuperAdmin: false,
        spaces: [
          { slug: "a", role: "manager" },
          { slug: "b", role: "sales_rep" },
        ],
      }),
    ).toBe("/espaces");
  });
});

describe("safeNextPath", () => {
  it("accepte un chemin interne", () => {
    expect(safeNextPath("/e/acme/equipe?x=1")).toBe("/e/acme/equipe?x=1");
  });

  it("refuse tout ce qui pourrait sortir du site", () => {
    for (const value of [
      "https://pirate.example",
      "//pirate.example",
      "/\\pirate.example",
      "javascript:alert(1)",
      "",
      null,
      42,
    ]) {
      expect(safeNextPath(value)).toBeNull();
    }
  });

  it("refuse une boucle vers la page de connexion", () => {
    expect(safeNextPath("/connexion?suivant=/admin")).toBeNull();
  });
});
