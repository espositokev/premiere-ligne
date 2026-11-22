import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { getOrganizationActivity } from "@/lib/data/platform";
import { toCsv } from "@/lib/domain/dashboard";

/** Export CSV de l'activité par entreprise (super admin). */
export async function GET() {
  const user = await requireSuperAdmin();
  const rows = await getOrganizationActivity();
  await audit({ action: "export.csv", actorUserId: user.id, details: { table: "entreprises" } });
  const csv = toCsv(
    [
      "Entreprise",
      "Statut",
      "Membres actifs",
      "Connectés sur 30 jours",
      "Coachings clôturés ce mois",
      "Évaluations validées ce mois",
    ],
    rows.map((r) => [
      r.name,
      r.status,
      r.members,
      r.activeUsers30d,
      r.coachingsThisMonth,
      r.evaluationsThisMonth,
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activite-entreprises-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
