import { expect, test } from "@playwright/test";

import { admin, backendAvailable, loginWithCode, uniqueSuffix } from "./support/backend";
import { seedTeam } from "./support/seed";

test.describe("Pilotage", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("le tableau de bord du manager signale le commercial jamais coaché et s'exporte", async ({
    page,
  }) => {
    const seed = await seedTeam(uniqueSuffix());
    await loginWithCode(page, seed.managerEmail);
    await page.goto(`/e/${seed.slug}`);
    await expect(page.getByText("Jamais coaché")).toBeVisible();
    await expect(page.getByText("Points faibles de l'équipe")).toBeVisible();
    const csv = await page.request.get(`/e/${seed.slug}/export/commerciaux`);
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Léo Bernard");
  });

  test("le responsable voit l'application comme un commercial, sans rien pouvoir modifier", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours sur ordinateur uniquement");
    test.setTimeout(90_000);
    const seed = await seedTeam(uniqueSuffix());
    await loginWithCode(page, seed.adminEmail);
    await page.goto(`/e/${seed.slug}/parametres/utilisateurs/${seed.repId}`);
    await page.getByRole("button", { name: "Voir en tant que Léo" }).click();
    await expect(page.getByText("Aperçu en tant que Léo Bernard — lecture seule")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ma progression" })).toBeVisible();

    // Une tentative d'écriture est refusée.
    await page.goto(`/e/${seed.slug}/moi/plan`);
    // Plan vide : le formulaire d'ajout est déjà ouvert.
    await page.getByLabel("Ton action").fill("Écriture interdite");
    await page.getByRole("button", { name: "Ajouter l'action" }).click();
    await expect(page.getByText("Vous ne pouvez pas modifier ce plan.").first()).toBeVisible();
    const { count } = await admin()
      .from("actions")
      .select("id", { count: "exact", head: true })
      .eq("subject_membership_id", seed.repId);
    expect(count).toBe(0);

    await page.getByRole("link", { name: "Revenir à ma vue" }).click();
    await expect(page.getByText(/Aperçu en tant que/)).toHaveCount(0);

    // Le début de l'aperçu est journalisé.
    await page.goto(`/e/${seed.slug}/parametres/journal`);
    await expect(page.getByText("« Voir en tant que »").first()).toBeVisible();
  });

  test("le responsable désactive les demandes de coaching", async ({ browser, page }) => {
    const seed = await seedTeam(uniqueSuffix());
    await loginWithCode(page, seed.adminEmail);
    await page.goto(`/e/${seed.slug}/parametres/entreprise`);
    await page.getByLabel(/Demandes de coaching/).uncheck();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Paramètres enregistrés").first()).toBeVisible();

    const repContext = await browser.newContext();
    const repPage = await repContext.newPage();
    await loginWithCode(repPage, seed.repEmail);
    await repPage.goto(`/e/${seed.slug}/coachings`);
    await expect(repPage.getByRole("heading", { name: "Mes coachings" })).toBeVisible();
    await expect(repPage.getByRole("link", { name: "Demander un coaching" })).toHaveCount(0);
    await repContext.close();
  });
});
