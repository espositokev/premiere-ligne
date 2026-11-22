import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

import type { Database } from "./types";

/**
 * Client Supabase côté serveur (Server Components, server actions, route handlers),
 * agissant avec la session de l'utilisateur connecté : la RLS s'applique.
 */
export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component, qui ne peut pas écrire de cookie :
            // le proxy (étape 1) rafraîchit la session, on peut ignorer.
          }
        },
      },
    },
  );
}
