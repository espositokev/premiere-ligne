import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { OrgStatus } from "@/lib/supabase/types";

export const STATUS_LABELS: Record<OrgStatus, string> = {
  actif: "Active",
  suspendu: "Suspendue",
  archive: "Archivée",
};

const STATUS_TONES = { actif: "success", suspendu: "warning", archive: "muted" } as const;

/** Liste des entreprises avec le nombre d'utilisateurs actifs par rôle (§4.2). */
export async function OrganizationTable() {
  const supabase = await createClient();
  const [{ data: organizations }, { data: memberships }] = await Promise.all([
    supabase.from("organizations").select("id, name, slug, status, created_at").order("name"),
    supabase.from("memberships").select("organization_id, role").eq("active", true),
  ]);

  return (
    <ul className="divide-y divide-line rounded-(--radius-card) border border-line bg-surface">
      {(organizations ?? []).map((organization) => {
        const members = (memberships ?? []).filter((m) => m.organization_id === organization.id);
        const count = (role: string) => members.filter((m) => m.role === role).length;
        return (
          <li key={organization.id}>
            <Link
              href={`/admin/entreprises/${organization.id}`}
              className="flex items-center gap-4 p-4 hover:bg-bone/60"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-semibold">{organization.name}</span>
                  <Badge tone={STATUS_TONES[organization.status]}>
                    {STATUS_LABELS[organization.status]}
                  </Badge>
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {count("org_admin")} responsable{count("org_admin") > 1 ? "s" : ""} ·{" "}
                  {count("manager")} manager{count("manager") > 1 ? "s" : ""} · {count("sales_rep")}{" "}
                  commercia
                  {count("sales_rep") > 1 ? "ux" : "l"} · créée le{" "}
                  {format(new Date(organization.created_at), "dd/MM/yyyy", { locale: fr })}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
