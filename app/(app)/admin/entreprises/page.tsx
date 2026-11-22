import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

import { OrganizationTable } from "../organization-table";

export const metadata: Metadata = { title: "Entreprises" };

export default async function OrganizationsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  return (
    <>
      <PageHeader
        title="Entreprises"
        description="Les espaces de vos clients."
        action={
          <Button asChild>
            <Link href="/admin/entreprises/nouvelle">
              <Plus aria-hidden="true" />
              Nouvelle entreprise
            </Link>
          </Button>
        }
      />
      {count ? (
        <OrganizationTable />
      ) : (
        <EmptyState
          icon={Building2}
          title="Aucune entreprise cliente"
          text="Créez le premier espace client."
        />
      )}
    </>
  );
}
