import { expect, test } from "@playwright/test";

import {
  admin,
  backendAvailable,
  createUser,
  loginWithCode,
  uniqueSuffix,
} from "./support/backend";
import { seedTeam } from "./support/seed";

test.describe("Options IA", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("le fondateur active le Pack IA et le responsable voit ses compteurs", async ({
    browser,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours sur ordinateur uniquement");
    const id = uniqueSuffix();
    const seed = await seedTeam(id);

    const email = `super.ia.${id}@test.local`;
    await createUser({ email, firstName: "Kevin", lastName: "Fondateur", superAdmin: true });
    await loginWithCode(page, email);
    await page.goto(`/admin/entreprises/${seed.orgId}`);
    await expect(page.getByLabel("Option active")).toHaveValue("aucune");
    await page.getByLabel("Option active").selectOption("pack_ia");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Option IA enregistrée").first()).toBeVisible();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginWithCode(adminPage, seed.adminEmail);
    await adminPage.goto(`/e/${seed.slug}/parametres/entreprise`);
    await expect(adminPage.getByText("Pack IA", { exact: true })).toBeVisible();
    await expect(adminPage.getByText("Appels analysés ce mois-ci")).toBeVisible();
    await expect(adminPage.getByText("0 / 20")).toBeVisible();
    await adminContext.close();
  });

  test("sans option, la génération de Dojos par l'IA est proposée à l'activation", async ({
    page,
  }) => {
    const seed = await seedTeam(uniqueSuffix());
    await loginWithCode(page, seed.managerEmail);
    await page.goto(`/e/${seed.slug}/dojos/nouveau`);
    await expect(page.getByRole("button", { name: /Générer selon la méthode/ })).toBeDisabled();
  });
});
