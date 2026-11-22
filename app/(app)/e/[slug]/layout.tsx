import { Eye } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { getMySpaces } from "@/lib/auth/current-user";
import { getOrgContext } from "@/lib/auth/org-context";
import { orgNavigation } from "@/lib/domain/navigation";

export default async function OrgLayout({ children, params }: LayoutProps<"/e/[slug]">) {
  const { slug } = await params;
  const context = await getOrgContext(slug);
  const spaces = await getMySpaces();

  const banner = context.isSuperAdminVisit ? (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-fluo px-4 py-2 text-sm font-semibold text-forest-deep sm:px-6 lg:px-10">
      <span className="flex items-center gap-2">
        <Eye aria-hidden="true" className="size-4" />
        Vous êtes dans l&apos;espace de {context.organization.name} en tant que super admin.
      </span>
      <Link href={`/admin/entreprises/${context.organization.id}`} className="underline">
        Revenir à l&apos;administration
      </Link>
    </div>
  ) : null;

  return (
    <AppShell
      nav={orgNavigation(context.organization.slug, context.role)}
      contextLabel={context.organization.name}
      userName={`${context.user.firstName} ${context.user.lastName}`}
      showSpacesLink={spaces.length > 1 || context.user.isSuperAdmin}
      banner={banner}
    >
      {children}
    </AppShell>
  );
}
