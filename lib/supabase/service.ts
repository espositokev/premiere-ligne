import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

import type { Database } from "./types";

/**
 * Client « service role » : contourne la RLS.
 * À n'utiliser que dans du code serveur qui a DÉJÀ vérifié les droits de l'utilisateur réel
 * (invitations, emails, « voir en tant que », tâches planifiées — §8.1).
 * Ne jamais l'importer dans un composant client : "server-only" fait échouer le build.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
