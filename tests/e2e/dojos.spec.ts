import { expect, test } from "@playwright/test";

import {
  admin,
  backendAvailable,
  createUser,
  loginWithCode,
  uniqueSuffix,
} from "./support/backend";

test.describe("Dojos", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("un manager consulte un Dojo de la bibliothèque et crée le sien", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours complet sur ordinateur uniquement");
    const id = uniqueSuffix();
    const client = admin();

    // Entreprise créée avec la matrice automobile (et donc ses 42 Dojos).
    const { data: org } = await client
      .from("organizations")
      .insert({ name: `Dojo ${id}`, slug: `dojo-${id}` })
      .select("id")
      .single();
    const { data: template } = await client
      .from("framework_templates")
      .select("id")
      .eq("name", "Vente automobile")
      .single();
    await client.rpc("copy_template_to_organization", { template: template!.id, org: org!.id });

    const email = `manager.dojo.${id}@test.local`;
    const userId = await createUser({ email, firstName: "Julien", lastName: "Petit" });
    await client
      .from("memberships")
      .insert({ organization_id: org!.id, user_id: userId, role: "manager" });

    await loginWithCode(page, email);
    await page.goto(`/e/dojo-${id}/dojos`);
    await expect(page.getByRole("heading", { name: "Dojos" })).toBeVisible();
    await page.getByRole("link", { name: /L'accueil personnalisé/ }).click();

    // Les 3 phases se lisent une par une.
    await expect(page.getByText("Objectif pédagogique")).toBeVisible();
    await expect(page.getByText("Le standard : l'accueil en 4 gestes clés")).toBeVisible();
    await page.getByRole("link", { name: /Phase 2/ }).click();
    await expect(page.getByText("Notice du manager")).toBeVisible();
    await page.getByRole("link", { name: /Phase 3/ }).click();
    await expect(page.getByText("Grille d'observation")).toBeVisible();

    // Un manager ne modifie pas la bibliothèque : il en fait une copie à adapter.
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
    await page.getByRole("button", { name: "Copier pour l'adapter" }).click();
    await expect(page.getByRole("heading", { name: "Modifier le Dojo" })).toBeVisible();
    await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
      "L'accueil personnalisé (adapté)",
    );

    // Création d'un Dojo à partir d'une page structurée.
    await page.goto(`/e/dojo-${id}/dojos/nouveau`);
    await page
      .getByLabel("Sous-compétence visée")
      .selectOption({ label: "Accueil en moins de 20s" });
    await page.getByRole("button", { name: /Partir d'une page structurée/ }).click();
    await page.getByLabel("Titre du Dojo").fill("Accueillir au téléphone");
    await page.getByRole("button", { name: "Créer le Dojo" }).click();
    await expect(page.getByRole("heading", { name: "Modifier le Dojo" })).toBeVisible();
    await page
      .getByLabel("Objectif pédagogique")
      .fill("Le commercial sait décrocher en moins de 3 sonneries.");
    await page.getByRole("button", { name: "Enregistrer le Dojo" }).click();
    await expect(page.getByText("Dojo enregistré")).toBeVisible();
  });
});
