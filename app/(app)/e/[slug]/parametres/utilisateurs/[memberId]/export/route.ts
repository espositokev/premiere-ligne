import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { collectMemberData, canAdministerMembership } from "@/lib/rgpd";
import { uuidSchema } from "@/lib/validation/schemas";

/** Export des données d'une personne (droit d'accès RGPD, §14), en JSON. */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/e/[slug]/parametres/utilisateurs/[memberId]/export">,
) {
  const { memberId } = await params;
  if (!uuidSchema.safeParse(memberId).success)
    return new NextResponse("Introuvable", { status: 404 });
  const rights = await canAdministerMembership(memberId);
  if (!rights) return new NextResponse("Accès refusé", { status: 403 });

  const data = await collectMemberData(
    memberId,
    rights.member.organization_id,
    rights.member.user_id,
  );
  await audit({
    action: "export.user_data",
    actorUserId: rights.actorId,
    organizationId: rights.member.organization_id,
    targetType: "membership",
    targetId: memberId,
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-${memberId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
