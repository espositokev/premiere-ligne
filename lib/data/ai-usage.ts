import "server-only";

import { now } from "@/lib/clock";
import { checkAiAccess, currentMonthStart, type AiAccess } from "@/lib/domain/ai-plan";
import { createClient } from "@/lib/supabase/server";
import type { AiPlan, AiUsageKind } from "@/lib/supabase/types";

export type AiOverview = {
  plan: AiPlan;
  usage: Record<AiUsageKind, number>;
};

/** Option IA de l'entreprise et usage du mois en cours (heure de Paris). */
export async function loadAiOverview(organizationId: string): Promise<AiOverview> {
  const supabase = await createClient();
  const since = currentMonthStart(now());
  const [{ data: org }, { data: rows }] = await Promise.all([
    supabase.from("organizations").select("ai_plan").eq("id", organizationId).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("kind")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
  ]);
  const usage: Record<AiUsageKind, number> = { dojo: 0, analyse_appel: 0 };
  for (const row of rows ?? []) usage[row.kind] += 1;
  return { plan: org?.ai_plan ?? "aucune", usage };
}

export async function loadAiAccess(
  organizationId: string,
  kind: AiUsageKind,
): Promise<AiAccess & { plan: AiPlan }> {
  const overview = await loadAiOverview(organizationId);
  return { ...checkAiAccess(overview.plan, kind, overview.usage[kind]), plan: overview.plan };
}

/** Note une utilisation. Appelé après une génération réussie. */
export async function recordAiUsage(organizationId: string, kind: AiUsageKind): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_usage")
    .insert({ organization_id: organizationId, kind });
  if (error) console.error("[ia] usage", error.message);
}
