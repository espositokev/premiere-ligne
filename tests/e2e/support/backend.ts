import { createHash, randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Outils des tests de bout en bout qui ont besoin d'une vraie base (Supabase local en CI).
 * Sans ces variables, les tests concernés sont ignorés.
 */
export const backendAvailable = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.MAILPIT_URL,
);

export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function uniqueSuffix() {
  return randomBytes(4).toString("hex");
}

/** Crée un compte prêt à l'emploi (profil, CGU acceptées). */
export async function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  superAdmin?: boolean;
}) {
  const client = admin();
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser");
  const { error: profileError } = await client.from("profiles").insert({
    id: data.user.id,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    is_super_admin: input.superAdmin ?? false,
    terms_accepted_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return data.user.id;
}

/** Crée une invitation dont on connaît le jeton (l'email réel est simulé en test). */
export async function createInvitation(input: {
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "org_admin" | "manager" | "sales_rep";
  teamId?: string | null;
}) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await admin()
    .from("invitations")
    .insert({
      organization_id: input.organizationId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      team_id: input.teamId ?? null,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
  if (error) throw error;
  return token;
}

/** Lit le dernier code à 6 chiffres reçu par une adresse dans Mailpit (boîte de test de Supabase local). */
export async function latestLoginCode(email: string): Promise<string> {
  const base = process.env.MAILPIT_URL!.replace(/\/$/, "");
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (search.ok) {
      const body = (await search.json()) as { messages?: { ID: string }[] };
      const first = body.messages?.[0];
      if (first) {
        const message = await fetch(`${base}/api/v1/message/${first.ID}`);
        const detail = (await message.json()) as { Text?: string; HTML?: string };
        const match = `${detail.Text ?? ""} ${detail.HTML ?? ""}`.match(/\b(\d{6})\b/);
        if (match?.[1]) return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Aucun code reçu pour ${email}`);
}

/** Connexion complète par code email, comme un vrai utilisateur. */
export async function loginWithCode(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email professionnelle").fill(email);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(page.getByLabel("Code reçu par email")).toBeVisible();
  const code = await latestLoginCode(email);
  await page.getByLabel("Code reçu par email").fill(code);
  await page.getByRole("button", { name: "Me connecter" }).click();
}
