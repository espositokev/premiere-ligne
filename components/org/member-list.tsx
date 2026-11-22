import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { MemberSummary } from "@/lib/data/organization";
import { ROLE_LABELS } from "@/lib/domain/roles";
import { cn } from "@/lib/utils";

/** Liste de membres. Chaque ligne mène à sa fiche quand `hrefFor` est fourni. */
export function MemberList({
  members,
  hrefFor,
  showRole = true,
}: {
  members: MemberSummary[];
  hrefFor?: (member: MemberSummary) => string;
  showRole?: boolean;
}) {
  return (
    <ul className="divide-y divide-line rounded-(--radius-card) border border-line bg-surface">
      {members.map((member) => {
        const content = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold",
                member.active ? "bg-forest text-bone" : "bg-line text-muted",
              )}
            >
              {member.firstName[0]}
              {member.lastName[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-semibold", !member.active && "text-muted")}>
                {member.firstName} {member.lastName}
              </span>
              <span className="block truncate text-sm text-muted">
                {[member.jobTitle, member.email].filter(Boolean).join(" · ")}
              </span>
              <span className="mt-1.5 flex flex-wrap gap-2">
                {showRole ? <Badge>{ROLE_LABELS[member.role]}</Badge> : null}
                {member.teamName ? <Badge tone="muted">{member.teamName}</Badge> : null}
                {!member.active ? <Badge tone="danger">Désactivé</Badge> : null}
              </span>
            </span>
            {hrefFor ? (
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
            ) : null}
          </>
        );
        return (
          <li key={member.id}>
            {hrefFor ? (
              <Link href={hrefFor(member)} className="flex items-center gap-3 p-4 hover:bg-bone/60">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-4">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
