import { Eye } from "lucide-react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { getActivePreview } from "@/lib/auth/preview";

/** Toutes les pages connectées : il faut un compte et avoir accepté les CGU (§14). */
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (!user.termsAcceptedAt) redirect("/bienvenue");
  const preview = await getActivePreview();
  return (
    <>
      {preview ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 bg-forest-deep px-4 py-2 text-sm font-semibold text-bone"
        >
          <span className="flex items-center gap-2">
            <Eye aria-hidden="true" className="size-4 text-fluo" />
            Aperçu en tant que {preview.targetName} — lecture seule
          </span>
          <a
            href={`/apercu/quitter?retour=${encodeURIComponent(`/e/${preview.organizationSlug}/parametres/utilisateurs`)}`}
            className="rounded-(--radius-control) bg-fluo px-3 py-1 text-forest-deep"
          >
            Revenir à ma vue
          </a>
        </div>
      ) : null}
      {children}
    </>
  );
}
