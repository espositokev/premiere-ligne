import { z } from "zod";

/**
 * Variables publiques (exposées au navigateur). Validées au premier accès :
 * une variable manquante produit une erreur claire plutôt qu'un plantage obscur.
 * Next.js ne remplace que les accès littéraux `process.env.NEXT_PUBLIC_…`, d'où leur écriture explicite.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function publicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
