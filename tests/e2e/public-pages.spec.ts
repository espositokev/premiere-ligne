import { expect, test } from "@playwright/test";

test.describe("Pages publiques", () => {
  test("l'accueil présente le slogan et mène à la connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Première Ligne/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("On forme là où ça se joue.").first()).toBeVisible();

    await page.getByRole("link", { name: "Se connecter" }).first().click();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  for (const [path, title] of [
    ["/mentions-legales", "Mentions légales"],
    ["/confidentialite", "Politique de confidentialité"],
    ["/cgu", "Conditions générales d'utilisation"],
  ] as const) {
    test(`la page ${path} s'affiche avec ses zones à compléter`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(/\[À COMPLÉTER/).first()).toBeVisible();
    });
  }

  test("aucun défilement horizontal sur mobile", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
