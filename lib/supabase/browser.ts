import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

import type { Database } from "./types";

/**
 * Client Supabase côté navigateur : clé anon + session de l'utilisateur.
 * Lecture uniquement : toutes les écritures passent par des server actions (§8.1).
 */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
