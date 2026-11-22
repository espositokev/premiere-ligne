import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DojoSessionSummary = {
  id: string;
  dojoId: string;
  dojoTitle: string;
  heldOn: string;
  scenario: number | null;
  scenarioTitle: string | null;
  wentWell: string | null;
  priorityAxis: string | null;
  commitment: string | null;
  coachName: string;
  participants: { id: string; name: string }[];
};

type Raw = {
  id: string;
  dojo_id: string;
  held_on: string;
  scenario: number | null;
  went_well: string | null;
  priority_axis: string | null;
  commitment: string | null;
  dojos: {
    title: string;
    content: { offline?: { scenarios?: { title?: string }[] } } | null;
  } | null;
  coach: { first_name: string; last_name: string } | null;
  dojo_session_participants: {
    membership_id: string;
    memberships: { profiles: { first_name: string; last_name: string } | null } | null;
  }[];
};

/** Séances de Dojo visibles (la base filtre), pour un Dojo ou pour un commercial. */
export async function listDojoSessions(
  organizationId: string,
  filters: { dojoId?: string; memberId?: string } = {},
): Promise<DojoSessionSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("dojo_sessions")
    .select(
      `id, dojo_id, held_on, scenario, went_well, priority_axis, commitment,
       dojos(title, content),
       coach:profiles!dojo_sessions_coach_user_id_fkey(first_name, last_name),
       dojo_session_participants${filters.memberId ? "!inner" : ""}(membership_id,
         memberships!dojo_session_participants_membership_id_organization_id_fkey(profiles(first_name, last_name)))`,
    )
    .eq("organization_id", organizationId)
    .order("held_on", { ascending: false })
    .limit(100);
  if (filters.dojoId) query = query.eq("dojo_id", filters.dojoId);
  if (filters.memberId)
    query = query.eq("dojo_session_participants.membership_id", filters.memberId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Raw[]).map((s) => ({
    id: s.id,
    dojoId: s.dojo_id,
    dojoTitle: s.dojos?.title ?? "Dojo",
    heldOn: s.held_on,
    scenario: s.scenario,
    scenarioTitle: s.scenario
      ? (s.dojos?.content?.offline?.scenarios?.[s.scenario - 1]?.title ?? null)
      : null,
    wentWell: s.went_well,
    priorityAxis: s.priority_axis,
    commitment: s.commitment,
    coachName: s.coach ? `${s.coach.first_name} ${s.coach.last_name}` : "—",
    participants: s.dojo_session_participants.map((p) => ({
      id: p.membership_id,
      name: p.memberships?.profiles
        ? `${p.memberships.profiles.first_name} ${p.memberships.profiles.last_name}`
        : "—",
    })),
  }));
}
