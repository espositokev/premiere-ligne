import { expect, test } from "@playwright/test";

import { admin, backendAvailable, loginWithCode, uniqueSuffix } from "./support/backend";
import { seedTeam } from "./support/seed";

test.describe("Coachings", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("demande, planification, compte rendu, clôture et commentaire du commercial", async ({
    browser,
    page,
  }) => {
    const seed = await seedTeam(uniqueSuffix());

    // 1. Le commercial demande un coaching.
    const repContext = await browser.newContext();
    const repPage = await repContext.newPage();
    await loginWithCode(repPage, seed.repEmail);
    await repPage.goto(`/e/${seed.slug}/coachings`);
    await repPage.getByRole("link", { name: "Demander un coaching" }).click();
    await repPage
      .locator("details", { hasText: "Accueil en moins de 20s" })
      .locator("summary")
      .first()
      .click();
    await repPage.getByLabel("Accueil en moins de 20s").check();
    await repPage.getByLabel("Ton message").fill("J'ai du mal le samedi quand il y a du monde");
    await repPage.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(repPage.getByText("En attente")).toBeVisible();

    // 2. Le manager voit la demande et planifie le coaching (formulaire prérempli).
    await loginWithCode(page, seed.managerEmail);
    await page.goto(`/e/${seed.slug}/coachings`);
    await expect(page.getByText("J'ai du mal le samedi")).toBeVisible();
    await page.getByRole("link", { name: "Planifier le coaching" }).click();
    await expect(
      page.getByRole("button", { name: /Retirer Accueil en moins de 20s/ }),
    ).toBeVisible();
    await page.getByLabel("Lieu").fill("Concession de Mérignac");
    await page.getByRole("button", { name: "Planifier le coaching" }).click();
    await expect(page.getByText(/a reçu un email avec l'invitation/)).toBeVisible();
    const coachingUrl = page.url().split("?")[0]!;
    const coachingId = coachingUrl.split("/").pop()!;

    // Le coaching a eu lieu : on le place dans le passé.
    await admin()
      .from("coachings")
      .update({ scheduled_at: new Date(Date.now() - 5 * 3_600_000).toISOString() })
      .eq("id", coachingId);

    // 3. Compte rendu : observation, points forts, une action ; enregistrement automatique.
    await page.goto(coachingUrl);
    await expect(page.getByRole("heading", { name: /Coaching de Léo Bernard/ })).toBeVisible();
    await page
      .locator('[data-skill="Accueil en moins de 20s"]')
      .getByRole("radio", { name: /^2 :/ })
      .click();
    await page.getByLabel("Points forts").fill("Très bon sourire, contact facile");
    await page.getByRole("button", { name: "Ajouter une action" }).click();
    await page.getByLabel("Action 1").fill("Saluer chaque client en moins de 20 secondes");
    await expect(page.getByText(/Brouillon enregistré à/)).toBeVisible({ timeout: 10_000 });

    // 4. Clôture en deux temps.
    await page.getByRole("button", { name: "Clôturer le compte rendu" }).click();
    await page.getByRole("button", { name: "Confirmer la clôture" }).click();
    await expect(page.getByText("Clôturé", { exact: true })).toBeVisible();
    await expect(page.getByText("Très bon sourire, contact facile")).toBeVisible();

    // L'action rejoint le plan de progrès du commercial.
    const { data: actions } = await admin()
      .from("actions")
      .select("title, source")
      .eq("coaching_id", coachingId);
    expect(actions).toEqual([
      { title: "Saluer chaque client en moins de 20 secondes", source: "coaching" },
    ]);

    // 5. Le commercial lit le compte rendu et ajoute son commentaire.
    await repPage.goto(`/e/${seed.slug}/coachings`);
    await repPage
      .getByRole("link", { name: /Avec Julien Petit/ })
      .first()
      .click();
    await expect(repPage.getByText("Très bon sourire, contact facile")).toBeVisible();
    await expect(repPage.getByText(/observée en coaching/)).toBeVisible();
    await repPage.getByLabel("Ton commentaire").fill("Merci, je m'y mets dès samedi");
    await repPage.getByRole("button", { name: "Enregistrer mon commentaire" }).click();
    await expect(repPage.getByText("Commentaire enregistré").first()).toBeVisible();
    await repContext.close();
  });

  test("le commercial ne lit pas un compte rendu en cours", async ({ page }) => {
    const seed = await seedTeam(uniqueSuffix());
    const client = admin();
    const { data: manager } = await client
      .from("memberships")
      .select("user_id")
      .eq("organization_id", seed.orgId)
      .eq("role", "manager")
      .single();
    const { data: coaching } = await client
      .from("coachings")
      .insert({
        organization_id: seed.orgId,
        subject_membership_id: seed.repId,
        coach_user_id: manager!.user_id,
        scheduled_at: new Date(Date.now() - 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    await client.from("coaching_reports").insert({
      coaching_id: coaching!.id,
      organization_id: seed.orgId,
      strengths: "Texte confidentiel en cours",
    });

    await loginWithCode(page, seed.repEmail);
    await page.goto(`/e/${seed.slug}/coachings/${coaching!.id}`);
    await expect(
      page.getByText("Le compte rendu sera disponible ici après le coaching."),
    ).toBeVisible();
    await expect(page.getByText("Texte confidentiel en cours")).toHaveCount(0);
  });

  test("le manager note une séance de Dojo, visible par le commercial", async ({
    browser,
    page,
  }) => {
    const seed = await seedTeam(uniqueSuffix());
    const { data: dojo } = await admin()
      .from("dojos")
      .select("id, title")
      .eq("organization_id", seed.orgId)
      .eq("status", "valide")
      .limit(1)
      .single();

    await loginWithCode(page, seed.managerEmail);
    await page.goto(`/e/${seed.slug}/dojos/${dojo!.id}`);
    await page.getByRole("link", { name: "Noter une séance" }).click();
    await page.getByLabel("Léo Bernard").check();
    await page.getByLabel("Engagement pris").fill("Proposer un essai à chaque client");
    await page.getByRole("button", { name: "Enregistrer la séance" }).click();
    await expect(page.getByText("Séance enregistrée")).toBeVisible();
    await expect(page.getByText("Proposer un essai à chaque client")).toBeVisible();

    const repContext = await browser.newContext();
    const repPage = await repContext.newPage();
    await loginWithCode(repPage, seed.repEmail);
    await repPage.goto(`/e/${seed.slug}/coachings`);
    await expect(repPage.getByText("Mes séances de Dojo")).toBeVisible();
    await expect(repPage.getByText("Proposer un essai à chaque client")).toBeVisible();
    await repContext.close();
  });
});
