import { expect, test } from "@playwright/test";

import { backendAvailable, createUser, loginWithCode, uniqueSuffix } from "./support/backend";

test.describe("Matrices de compétences", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("le fondateur crée un client avec la matrice automobile et l'adapte sur le terrain", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours complet sur ordinateur uniquement");
    const id = uniqueSuffix();
    const email = `super.ref.${id}@test.local`;
    await createUser({ email, firstName: "Kevin", lastName: "Fondateur", superAdmin: true });
    await loginWithCode(page, email);

    // Les deux modèles fournis sont là.
    await page.goto("/admin/modeles");
    await expect(page.getByRole("link", { name: /^Vente automobile/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Vente — socle général/ })).toBeVisible();

    // Création du client avec le modèle automobile.
    await page.goto("/admin/entreprises/nouvelle");
    await page.getByLabel("Nom de l'entreprise").fill(`Auto ${id}`);
    await page.getByLabel("Matrice de départ").selectOption({ label: "Vente automobile" });
    await page.getByRole("button", { name: "Créer l'entreprise" }).click();
    await expect(page.getByText("12 compétences · 40 sous-compétences")).toBeVisible();

    // Adaptation : ajout d'une sous-compétence au métier du client.
    await page.getByRole("link", { name: "Adapter la matrice" }).click();
    await expect(page.getByRole("heading", { name: "Matrice de compétences" })).toBeVisible();
    await page.getByText("Je sais créer un accueil personnalisé avec mon client").click();
    await page.getByText("Ajouter une sous-compétence").first().click();
    await page.getByLabel("Nom court").filter({ visible: true }).fill("Accueil atelier");
    await page
      .getByRole("button", { name: "Ajouter une sous-compétence" })
      .filter({ visible: true })
      .click();
    await expect(page.getByText("Accueil atelier ajouté")).toBeVisible();
    await expect(page.getByText("Accueil atelier", { exact: true })).toBeVisible();
    await expect(page.getByText("12 compétences · 41 sous-compétences")).toBeVisible();
  });
});
