/**
 * Types de la base, générés par `pnpm db:types` (supabase gen types typescript).
 * Fichier provisoire tant qu'aucune migration n'existe (étape 0) : il sera
 * entièrement remplacé par la génération à l'étape 1.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
