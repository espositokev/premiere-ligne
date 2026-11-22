import "server-only";

import { cache } from "react";

import { parseSettings, type OrgSettings } from "@/lib/domain/settings";
import { createClient } from "@/lib/supabase/server";

/** Paramètres de l'entreprise (valeurs par défaut si absents). */
export const getOrgSettings = cache(async (organizationId: string): Promise<OrgSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();
  return parseSettings(data?.settings);
});
