import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AuditEntry } from "@/lib/data/audit-log";
import { AUDIT_FILTERS, auditLabel } from "@/lib/domain/audit-labels";

function detailText(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const parts = [d.name, d.reason, d.status, d.title, d.role, d.email]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .slice(0, 2);
  return parts.length ? parts.join(" · ") : null;
}

/** Journal d'activité (§4.12) : une ligne par évènement, filtrable par famille. */
export function AuditTable({
  entries,
  baseHref,
  prefix,
  nextBefore,
  showOrganization,
}: {
  entries: AuditEntry[];
  baseHref: string;
  prefix: string;
  nextBefore?: number;
  showOrganization?: boolean;
}) {
  const withParams = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (v !== undefined && v !== "") search.set(k, String(v));
    const q = search.toString();
    return q ? `${baseHref}?${q}` : baseHref;
  };
  return (
    <>
      <nav
        aria-label="Filtrer le journal"
        className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-2">
          {AUDIT_FILTERS.map((f) => (
            <li key={f.value}>
              <Link
                href={withParams({ famille: f.value })}
                aria-current={prefix === f.value ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold ${
                  prefix === f.value
                    ? "bg-forest text-bone"
                    : "bg-surface text-forest-deep ring-1 ring-line"
                }`}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {entries.length === 0 ? (
        <p className="text-muted">Aucun évènement.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface">
          {entries.map((e) => {
            const detail = detailText(e.details);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <time
                  className="w-36 shrink-0 text-xs text-muted tabular-nums"
                  dateTime={e.createdAt}
                >
                  {new Date(e.createdAt).toLocaleString("fr-FR", {
                    timeZone: "Europe/Paris",
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{auditLabel(e.action)}</span>
                    {detail ? <span className="text-muted"> · {detail}</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {e.actorName}
                    {showOrganization && e.organizationName ? ` · ${e.organizationName}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {nextBefore ? (
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href={withParams({ famille: prefix, avant: nextBefore })}>
              Voir les évènements plus anciens
            </Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
