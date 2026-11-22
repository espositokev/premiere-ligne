import { Card } from "@/components/ui/card";

/** Indicateurs rapides en tête de fiche (§4.6). */
export function ProgressSummary({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 font-display text-xl font-bold tabular-nums sm:text-2xl">
            {item.value}
          </dd>
          {item.hint ? <dd className="text-xs text-muted">{item.hint}</dd> : null}
        </Card>
      ))}
    </dl>
  );
}
