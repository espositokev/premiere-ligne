import { expect, test } from "@playwright/test";

import {
  admin,
  backendAvailable,
  createInvitation,
  createUser,
  loginWithCode,
  uniqueSuffix,
} from "./support/backend";

test.describe("Comptes, entreprises et invitations", () => {
  test.skip(!backendAvailable, "Nécessite Supabase local (CI)");

  test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/connexion\?suivant=%2Fadmin/);
  });

  test("le super admin crée une entreprise et invite son responsable", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours complet sur ordinateur uniquement");
    const id = uniqueSuffix();
    const email = `super.${id}@test.local`;
    await createUser({ email, firstName: "Kevin", lastName: "Fondateur", superAdmin: true });

    await loginWithCode(page, email);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

    await page.getByRole("link", { name: "Nouvelle entreprise" }).first().click();
    await page.getByLabel("Nom de l'entreprise").fill(`Garage Test ${id}`);
    await expect(page.getByLabel("Adresse de l'espace")).toHaveValue(`garage-test-${id}`);
    await page.getByRole("button", { name: "Créer l'entreprise" }).click();

    await expect(page.getByRole("heading", { name: `Garage Test ${id}` })).toBeVisible();
    await page.getByLabel("Prénom").fill("Claire");
    await page.getByLabel("Nom", { exact: true }).fill("Martin");
    await page.getByLabel("Adresse email").fill(`claire.${id}@test.local`);
    await page.getByRole("button", { name: "Envoyer l'invitation" }).click();

    await expect(page.getByText("Invitation envoyée à Claire Martin")).toBeVisible();
    await expect(page.getByText(`claire.${id}@test.local`)).toBeVisible();
  });

  test("un responsable accepte son invitation, crée une équipe et invite un commercial", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Parcours complet sur ordinateur uniquement");
    const id = uniqueSuffix();
    const { data: org } = await admin()
      .from("organizations")
      .insert({ name: `Concession ${id}`, slug: `concession-${id}` })
      .select("id")
      .single();
    const token = await createInvitation({
      organizationId: org!.id,
      email: `resp.${id}@test.local`,
      firstName: "Sarah",
      lastName: "Leroy",
      role: "org_admin",
    });

    await page.goto(`/invitation/${token}`);
    await expect(page.getByRole("heading", { name: "Bienvenue Sarah" })).toBeVisible();
    await page.getByRole("button", { name: "Rejoindre l'espace" }).click();
    // Sans case cochée, le navigateur bloque l'envoi : on coche puis on valide.
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Rejoindre l'espace" }).click();
    await expect(page).toHaveURL(new RegExp(`/e/concession-${id}$`));
    await expect(page.getByText("Pour bien démarrer")).toBeVisible();

    // Le lien d'invitation ne fonctionne plus une fois utilisé.
    const reuse = await page.context().newPage();
    await reuse.goto(`/invitation/${token}`);
    await expect(reuse.getByRole("heading", { name: "Invitation indisponible" })).toBeVisible();
    await reuse.close();

    await page.goto(`/e/concession-${id}/parametres/equipes`);
    await page.getByLabel("Nom de l'équipe").fill("Équipe Nord");
    await page.getByRole("button", { name: "Créer l'équipe" }).click();
    await expect(page.getByText("Équipe « Équipe Nord » créée")).toBeVisible();

    await page.goto(`/e/concession-${id}/equipe`);
    await page.getByLabel("Prénom").fill("Léo");
    await page.getByLabel("Nom", { exact: true }).fill("Bernard");
    await page.getByLabel("Adresse email").fill(`leo.${id}@test.local`);
    await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
    await expect(page.getByText("Invitation envoyée à Léo Bernard")).toBeVisible();
    await expect(page.getByText(`leo.${id}@test.local`)).toBeVisible();
  });

  test("un commercial invité arrive sur son espace, avec la navigation mobile", async ({
    page,
  }) => {
    const id = uniqueSuffix();
    const client = admin();
    const { data: org } = await client
      .from("organizations")
      .insert({ name: `Agence ${id}`, slug: `agence-${id}` })
      .select("id")
      .single();
    const { data: team } = await client
      .from("teams")
      .insert({ organization_id: org!.id, name: "Équipe Sud" })
      .select("id")
      .single();
    const token = await createInvitation({
      organizationId: org!.id,
      email: `rep.${id}@test.local`,
      firstName: "Inès",
      lastName: "Moreau",
      role: "sales_rep",
      teamId: team!.id,
    });

    await page.goto(`/invitation/${token}`);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Rejoindre l'espace" }).click();
    await expect(page).toHaveURL(new RegExp(`/e/agence-${id}/moi$`));
    await expect(page.getByRole("heading", { name: "Ma progression" })).toBeVisible();

    // Un commercial n'accède pas aux pages de gestion.
    await page.goto(`/e/agence-${id}/parametres/utilisateurs`);
    await expect(page).toHaveURL(new RegExp(`/e/agence-${id}/moi$`));
  });
});
