import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { publicEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/session";
import type { Database } from "@/lib/supabase/types";

/**
 * « Voir en tant que » (§4.11), en lecture seule.
 *
 * - Le cookie `pl_apercu` contient {qui regarde, qui est regardé, entreprise, expiration}, signé
 *   avec PREVIEW_COOKIE_SECRET. On ne touche jamais à la session Supabase de l'utilisateur.
 * - À chaque requête, les droits de la personne réellement connectée sont revérifiés
 *   (super admin, ou responsable de l'entreprise de la personne regardée).
 * - Les lectures passent par un client Supabase muni d'un jeton court au nom de la personne
 *   regardée : la RLS montre exactement ce qu'elle voit. Ce client refuse lui-même toute écriture
 *   (les formulaires affichent alors une erreur), et les opérations avec la clé serveur (RGPD)
 *   sont refusées tant qu'un aperçu est actif.
 */

export const PREVIEW_COOKIE = "pl_apercu";
const PREVIEW_MINUTES = 60;

type Payload = { actor: string; target: string; org: string; exp: number };

function secret(): string | null {
  const value = process.env.PREVIEW_COOKIE_SECRET;
  return value && value.length >= 32 ? value : null;
}

function jwtSecret(): string | null {
  return process.env.SUPABASE_JWT_SECRET || null;
}

/** L'aperçu n'est disponible que si les deux secrets sont configurés. */
export function previewAvailable(): boolean {
  return Boolean(secret() && jwtSecret());
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function encodePreview(payload: Omit<Payload, "exp">): string {
  const key = secret();
  if (!key) throw new Error("PREVIEW_COOKIE_SECRET manquant");
  const body = base64url(
    JSON.stringify({ ...payload, exp: Date.now() + PREVIEW_MINUTES * 60_000 }),
  );
  return `${body}.${sign(body, key)}`;
}

export function decodePreview(value: string | undefined): Payload | null {
  const key = secret();
  if (!value || !key) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, key));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const PREVIEW_MAX_AGE = PREVIEW_MINUTES * 60;

/** Jeton d'accès court (5 min) au nom de la personne regardée, signé comme ceux de Supabase. */
function mintAccessToken(userId: string): string | null {
  const key = jwtSecret();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 300,
      is_preview: true,
    }),
  );
  return `${header}.${claims}.${sign(`${header}.${claims}`, key)}`;
}

export type ActivePreview = {
  actorId: string;
  targetUserId: string;
  organizationId: string;
  organizationSlug: string;
  targetName: string;
  accessToken: string;
};

/** Aperçu en cours, après revérification des droits de la personne réellement connectée. */
export const getActivePreview = cache(async (): Promise<ActivePreview | null> => {
  const cookieStore = await cookies();
  const payload = decodePreview(cookieStore.get(PREVIEW_COOKIE)?.value);
  if (!payload) return null;

  const real = await createSessionClient();
  const {
    data: { user },
  } = await real.auth.getUser();
  if (!user || user.id !== payload.actor || payload.target === payload.actor) return null;

  const [{ data: profile }, { data: isAdmin }, { data: target }, { data: org }] = await Promise.all(
    [
      real.from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle(),
      real.rpc("is_org_admin", { org: payload.org }),
      real
        .from("memberships")
        .select("user_id, profiles!inner(first_name, last_name, is_super_admin)")
        .eq("organization_id", payload.org)
        .eq("user_id", payload.target)
        .maybeSingle(),
      real.from("organizations").select("slug").eq("id", payload.org).maybeSingle(),
    ],
  );
  if (!target || !org || target.profiles.is_super_admin) return null;
  if (!profile?.is_super_admin && isAdmin !== true) return null;

  const accessToken = mintAccessToken(payload.target);
  if (!accessToken) return null;
  return {
    actorId: user.id,
    targetUserId: payload.target,
    organizationId: payload.org,
    organizationSlug: org.slug,
    targetName: `${target.profiles.first_name} ${target.profiles.last_name}`,
    accessToken,
  };
});

/** Client en lecture seule au nom de la personne regardée : toute écriture est refusée ici même. */
export function createPreviewClient(accessToken: string) {
  const env = publicEnv();
  const readOnlyFetch: typeof fetch = (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isRead =
      method === "GET" || method === "HEAD" || (method === "POST" && url.includes("/rest/v1/rpc/"));
    if (!isRead) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: "Aperçu en lecture seule", code: "42501" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return fetch(input, init);
  };
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: readOnlyFetch },
    },
  );
}
