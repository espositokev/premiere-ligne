import "server-only";

import { createPreviewClient, getActivePreview } from "@/lib/auth/preview";

import { createSessionClient } from "./session";

/**
 * Client Supabase côté serveur (Server Components, server actions, route handlers).
 * - Normalement : la session de l'utilisateur connecté, la RLS s'applique.
 * - Pendant un « voir en tant que » : un client en lecture seule au nom de la personne regardée.
 */
export async function createClient() {
  const preview = await getActivePreview();
  if (preview) return createPreviewClient(preview.accessToken);
  return createSessionClient();
}
