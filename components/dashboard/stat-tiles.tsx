import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTile = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  alert?: boolean;
};

/** Chiffres clés en tête de tableau de bord. */
export function StatTiles({ tiles, className }: { tiles: StatTile[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {tiles.map((tile) => {
        const content = (
          <Card
            className={cn(
              "h-full transition-colors",
              tile.href && "group-hover:border-forest",
              tile.alert && "border-danger/40 bg-danger/[0.03]",
            )}
          >
            <p
              className={cn(
                "font-display text-3xl font-semibold tabular-nums sm:text-4xl",
                tile.alert && "text-danger",
              )}
            >
              {tile.value}
            </p>
            <p className="mt-1 text-sm font-medium">{tile.label}</p>
            {tile.hint ? <p className="text-xs text-muted">{tile.hint}</p> : null}
          </Card>
        );
        return tile.href ? (
          <Link key={tile.label} href={tile.href} className="group">
            {content}
          </Link>
        ) : (
          <div key={tile.label}>{content}</div>
        );
      })}
    </div>
  );
}
