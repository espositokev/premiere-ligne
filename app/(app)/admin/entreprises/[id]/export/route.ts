import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { collectMemberData } from "@/lib/rgpd";
import { createServiceClient } from "@/lib/supabase/service";
import { uuidSchema } from "@/lib/validation/schemas";

/** Export complet d'une entreprise avant sa suppression (§14), super admin uniquement. */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/admin/entreprises/[id]/export">,
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin || user.previewActorId)
    return new NextResponse("Accès refusé", { status: 403 });
  if (!uuidSchema.safeParse(id).success) return new NextResponse("Introuvable", { status: 404 });

  const service = createServiceClient();
  const [{ data: organization }, { data: members }, { data: teams }, { data: frameworks }] =
    await Promise.all([
      service
        .from("organizations")
        .select("id, name, slug, status, settings, created_at, archived_at")
        .eq("id", id)
        .maybeSingle(),
      service.from("memberships").select("id, user_id").eq("organization_id", id),
      service.from("teams").select("id, name, active").eq("organization_id", id),
      service
        .from("frameworks")
        .select(
          "name, blocks(name, position, active, competencies(name, position, active, skills(name, statement, position, active)))",
        )
        .eq("organization_id", id),
    ]);
  if (!organization) return new NextResponse("Introuvable", { status: 404 });

  const people = [];
  for (const m of members ?? []) people.push(await collectMemberData(m.id, id, m.user_id));

  await audit({
    action: "export.user_data",
    actorUserId: user.id,
    organizationId: id,
    targetType: "organization",
    targetId: id,
  });
  return new NextResponse(
    JSON.stringify(
      { exported_at: new Date().toISOString(), organization, teams, frameworks, people },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="entreprise-${organization.slug}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
