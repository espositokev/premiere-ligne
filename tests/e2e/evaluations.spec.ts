import { expect, test, type Page } from "@playwright/test";

import {
  admin,
  backendAvailable,
  createUser,
  loginWithCode,
  uniqueSuffix,
} from "./support/backend";

/** Entreprise avec la matrice automobile, une équipe, son manager et un commercial. */
async function seedTeam(id: string) {
  const client = admin();
  const { data: org } = await client
    .from("organizations")
    .insert({ name: `Éval ${id}`, slug: `eval-${id}` })
    .select("id, slug")
    .single();
  const { data: template } = await client
    .from("framework_templates")
    .select("id")
    .eq("name", "Vente automobile")
    .single();
  await client.rpc("copy_template_to_organization", { template: template!.id, org: org!.id });
  const { data: team } = await client
    .from("teams")
    .insert({ organization_id: org!.id, name: "Bordeaux Lac" })
    .select("id")
    .single();

  const managerEmail = `manager.eval.${id}@test.local`;
  const repEmail = `rep.eval.${id}@test.local`;
  const managerId = await createUser({
    email: managerEmail,
    firstName: "Julien",
    lastName: "Petit",
  });
  const repId = await createUser({ email: repEmail, firstName: "Léo", lastName: "Bernard" });
  const { data: manager } = await client
    .from("memberships")
    .insert({ organization_id: org!.id, user_id: managerId, role: "manager" })
    .select("id")
    .single();
  const { data: rep } = await client
    .from("memberships")
    .insert({ organization_id: org!.id, user_id: repId, role: "sales_rep", team_id: team!.id })
    .select("id")
    .single();
  await client
    .from("team_managers")
    .insert({ team_id: team!.id, membership_id: manager!.id, organization_id: org!.id });

  return { slug: org!.slug, managerEmail, repEmail, repId: rep!.id };
}

function skillRow(page: Page, name: string) {
  return page.locator(`li[data-skill="${name}"]`);
}

test.describe("Évaluations", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("le manager évalue son commercial, qui voit sa progression", async ({ browser, page }) => {
    const seed = await seedTeam(uniqueSuffix());

    // Le manager ouvre la fiche de son commercial depuis son équipe.
    await loginWithCode(page, seed.managerEmail);
    await page.goto(`/e/${seed.slug}/equipe`);
    await page.getByRole("link", { name: /Léo Bernard/ }).click();
    await expect(page.getByRole("heading", { name: "Léo Bernard" })).toBeVisible();

    // Nouvelle évaluation : deux notes, enregistrées automatiquement.
    await page.getByRole("button", { name: "Nouvelle évaluation" }).click();
    await expect(page.getByText("0 / 40 notées")).toBeVisible();
    await skillRow(page, "Accueil en moins de 20s").getByRole("radio", { name: /^3 :/ }).click();
    await expect(page.getByText(/Maîtrise, résultats réguliers/)).toBeVisible();
    await skillRow(page, "Accueil en moins de 20s")
      .getByRole("button", { name: "Ajouter un commentaire" })
      .click();
    await page
      .getByLabel("Commentaire pour Accueil en moins de 20s")
      .fill("Très bon accueil ce matin");
    await expect(page.getByText(/Brouillon enregistré à/)).toBeVisible({ timeout: 10_000 });

    // On quitte puis on reprend : le brouillon est conservé.
    await page.getByRole("link", { name: "Continuer plus tard" }).click();
    await expect(page.getByRole("button", { name: "Reprendre l'évaluation" })).toBeVisible();
    await page.getByRole("button", { name: "Reprendre l'évaluation" }).click();
    await expect(page.getByText("1 / 40 notées")).toBeVisible();

    // Validation en deux temps.
    await page.getByRole("button", { name: "Valider l'évaluation" }).click();
    await page.getByRole("button", { name: "Confirmer la validation" }).click();
    await expect(page.getByRole("heading", { name: "Léo Bernard" })).toBeVisible();
    await expect(page.getByText("3 %")).toBeVisible(); // 1 sous-compétence maîtrisée sur 40

    // Note privée.
    await page.getByRole("link", { name: "Notes privées" }).click();
    await page.getByLabel("Nouvelle note").fill("Note confidentielle sur Léo");
    await page.getByRole("button", { name: "Ajouter la note" }).click();
    await expect(page.getByText("Note confidentielle sur Léo")).toBeVisible();

    // Le commercial voit l'évaluation validée, pas la note privée, et fait son auto-évaluation.
    const repContext = await browser.newContext();
    const repPage = await repContext.newPage();
    await loginWithCode(repPage, seed.repEmail);
    await repPage.goto(`/e/${seed.slug}/moi`);
    await expect(repPage.getByRole("heading", { name: "Salut Léo !" })).toBeVisible();
    await expect(repPage.getByText("3 %")).toBeVisible();
    await repPage.getByRole("link", { name: "Historique" }).click();
    await expect(repPage.getByText("Évaluation par Julien Petit")).toBeVisible();
    await expect(repPage.getByText("Note confidentielle sur Léo")).toHaveCount(0);

    await repPage.getByRole("button", { name: "Faire mon auto-évaluation" }).click();
    await expect(repPage.getByText("Précédente : 3")).toHaveCount(0); // autre type
    await skillRow(repPage, "Accueil en moins de 20s").getByRole("radio", { name: /^4 :/ }).click();
    await repPage.getByRole("button", { name: "Valider mon auto-évaluation" }).click();
    await repPage.getByRole("button", { name: "Confirmer la validation" }).click();
    await expect(repPage.getByRole("heading", { name: "Salut Léo !" })).toBeVisible();
    await expect(repPage.getByText(/Moi : 4/)).toBeVisible();
    await repContext.close();
  });

  test("un commercial ne peut pas ouvrir la fiche d'un collègue", async ({ page }) => {
    const seed = await seedTeam(uniqueSuffix());
    await loginWithCode(page, seed.repEmail);
    const response = await page.goto(`/e/${seed.slug}/equipe/${seed.repId}`);
    expect(page.url()).not.toContain(`/equipe/${seed.repId}`);
    expect(response?.status()).toBeLessThan(500);
  });
});
