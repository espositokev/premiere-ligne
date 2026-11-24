import {
  AI_PLAN_LABELS,
  AI_PLAN_PRICES,
  AI_USAGE_LABELS,
  monthlyLimit,
} from "@/lib/domain/ai-plan";
import type { AiOverview } from "@/lib/data/ai-usage";
import type { AiUsageKind } from "@/lib/supabase/types";

const KINDS: AiUsageKind[] = ["dojo", "analyse_appel"];

/** Option IA et compteurs du mois. */
export function AiUsageSummary({ overview }: { overview: AiOverview }) {
  const price = AI_PLAN_PRICES[overview.plan];
  const kinds = KINDS.filter((kind) => monthlyLimit(overview.plan, kind) > 0);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-display text-lg font-semibold">{AI_PLAN_LABELS[overview.plan]}</p>
        {price ? <p className="text-sm text-muted">{price}</p> : null}
      </div>
      {kinds.length === 0 ? (
        <p className="text-sm text-muted">
          La plateforme est offerte. Les options IA (Dojos générés à la demande, analyse
          d&apos;appels) s&apos;activent sur demande auprès de Première Ligne.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {kinds.map((kind) => {
            const limit = monthlyLimit(overview.plan, kind);
            const used = Math.min(overview.usage[kind], limit);
            return (
              <li key={kind}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{AI_USAGE_LABELS[kind]} ce mois-ci</span>
                  <span className="font-semibold tabular-nums">
                    {used} / {limit}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={limit}
                  aria-valuenow={used}
                  aria-label={AI_USAGE_LABELS[kind]}
                >
                  <div
                    className="h-full rounded-full bg-forest"
                    style={{ width: `${(used / limit) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
