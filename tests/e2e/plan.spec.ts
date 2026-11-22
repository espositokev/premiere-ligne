import { expect, test } from "@playwright/test";

import { admin, backendAvailable, loginWithCode, uniqueSuffix } from "./support/backend";
import { seedTeam } from "./support/seed";

test.describe("Plan de progrès", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("le commercial gère son plan, le manager suit les retards de l'équipe", async ({
    browser,
    page,
  }) => {
    const seed = await seedTeam(uniqueSuffix());
    const { data: manager } = await admin()
      .from("memberships")
      .select("user_id")
      .eq("organization_id", seed.orgId)
      .eq("role", "manager")
      .single();
    // Une action issue d'un coaching, déjà en retard.
    await admin().from("actions").insert({
      organization_id: seed.orgId,
      subject_membership_id: seed.repId,
      title: "Relancer les clients de la semaine",
      source: "coaching",
      due_date: "2026-01-05",
      created_by: manager!.user_id,
    });

    // Le commercial voit l'alerte, ajoute une action et la termine.
    await loginWithCode(page, seed.repEmail);
    await page.goto(`/e/${seed.slug}/moi`);
    await expect(page.getByText("1 action en retard")).toBeVisible();
    await page.getByText("1 action en retard").click();
    await expect(page.getByRole("heading", { name: "Mon plan de progrès" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /En retard/ })).toBeVisible();

    await page.getByText("Ajouter une action", { exact: true }).click();
    await page.getByLabel("Ton action").fill("Proposer un essai à chaque client");
    await page.getByRole("button", { name: "Ajouter l'action" }).click();
    const card = page.locator('[data-action="Proposer un essai à chaque client"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Je commence" }).click();
    await expect(card.getByText("En cours", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "C'est fait" }).click();
    await expect(page.getByText("Faites (1)")).toBeVisible();

    // Une action issue d'un coaching ne peut pas être supprimée par le commercial.
    const late = page.locator('[data-action="Relancer les clients de la semaine"]');
    await late.getByRole("button", { name: /Plus d'options/ }).click();
    await expect(late.getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(late.getByRole("button", { name: "Supprimer" })).toHaveCount(0);

    // Le manager filtre les actions en retard de son équipe et la marque faite.
    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await loginWithCode(managerPage, seed.managerEmail);
    await managerPage.goto(`/e/${seed.slug}/equipe/actions?retard=1`);
    const managerCard = managerPage.locator('[data-action="Relancer les clients de la semaine"]');
    await expect(managerCard).toBeVisible();
    await expect(
      managerPage.locator('[data-action="Proposer un essai à chaque client"]'),
    ).toHaveCount(0);
    await managerCard.getByRole("button", { name: "Fait", exact: true }).click();
    await expect(managerPage.getByText("Aucune action en retard")).toBeVisible();
    await managerContext.close();
  });
});
