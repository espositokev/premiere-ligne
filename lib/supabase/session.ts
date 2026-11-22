import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

import type { Database } from "./types";

/**
 * Client Supabase avec la session réelle de l'utilisateur connecté (cookies) : la RLS s'applique.
 * Utiliser `createClient` (lib/supabase/server) dans l'application : il gère aussi « voir en tant que ».
 */
export async function createSessionClient() {
  // Lire les cookies en premier : la page devient dynamique (jamais pré-rendue au build).
  const cookieStore = await cookies();
  const env = publicEnv();

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
