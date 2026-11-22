import Link from "next/link";

import { cn } from "@/lib/utils";

/** Onglets sous forme de liens (adresse partageable, aucun JavaScript nécessaire). */
export function TabsNav({
  tabs,
  current,
  label,
}: {
  tabs: { key: string; label: string; href: string }[];
  current: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => {
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold",
                  active
                    ? "border-forest text-forest-deep"
                    : "border-transparent text-muted hover:text-forest-deep",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
