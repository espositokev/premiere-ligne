import { NextResponse, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireCoach } from "@/lib/auth/require-org";
import { loadDashboard } from "@/lib/data/dashboard";
import { toCsv } from "@/lib/domain/dashboard";
import { canAdministerOrg } from "@/lib/domain/roles";

function day(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "";
}

/** Exports CSV des tableaux de bord (§4.10), journalisés. */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/e/[slug]/export/[table]">,
) {
  const { slug, table } = await params;
  const context = await requireCoach(slug);
  const data = await loadDashboard(context.organization.id, context.role);

  let csv: string;
  if (table === "commerciaux") {
    csv = toCsv(
      [
        "Commercial",
        "Équipe",
        "Maîtrise (%)",
        "Dernière évaluation",
        "Dernier coaching",
        "Jours sans coaching",
        "Actions en retard",
      ],
      data.rows.map((r) => [
        r.name,
        r.teamName,
        r.mastery,
        day(r.lastEvaluatedAt),
        day(r.lastCoachingAt),
        r.daysSinceCoaching,
        r.overdueActions,
      ]),
    );
  } else if (table === "equipes" && canAdministerOrg(context.role)) {
    csv = toCsv(
      [
        "Équipe",
        "Commerciaux",
        "Maîtrise moyenne (%)",
        "Couverture 90 jours (%)",
        "Sans coaching",
        "Actions en retard",
      ],
      data.teams.map((t) => [
        t.name,
        t.reps,
        t.mastery,
        t.coverage,
        t.withoutCoaching,
        t.overdueActions,
      ]),
    );
  } else {
    return new NextResponse("Introuvable", { status: 404 });
  }

  await audit({
    action: "export.csv",
    actorUserId: context.user.previewActorId ?? context.user.id,
    organizationId: context.organization.id,
    details: { table },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${table}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
