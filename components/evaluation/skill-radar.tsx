"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { RadarPoint } from "@/lib/domain/evaluation";

/**
 * Radar des compétences : un axe par compétence (moyenne de ses sous-compétences, 0 à 4).
 * Dernière évaluation en plein, précédente en clair, auto-évaluation en pointillés (§4.6).
 */
export function SkillRadar({
  points,
  selfLabel = "Auto-évaluation",
}: {
  points: RadarPoint[];
  selfLabel?: string;
}) {
  const data = points.map((p) => ({
    axis: p.label,
    current: p.current ?? 0,
    previous: p.previous ?? 0,
    self: p.self ?? 0,
  }));
  const hasPrevious = points.some((p) => p.previous !== null);
  const hasSelf = points.some((p) => p.self !== null);

  return (
    <figure>
      <div className="h-72 w-full sm:h-96" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            outerRadius="68%"
            margin={{ top: 8, right: 36, bottom: 8, left: 36 }}
          >
            <PolarGrid stroke="var(--color-line)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 4]} tickCount={5} tick={false} axisLine={false} />
            {hasPrevious ? (
              <Radar
                dataKey="previous"
                stroke="var(--color-forest-light)"
                strokeOpacity={0.35}
                fill="var(--color-forest-light)"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
            ) : null}
            <Radar
              dataKey="current"
              stroke="var(--color-forest)"
              strokeWidth={2}
              fill="var(--color-fluo)"
              fillOpacity={0.45}
              isAnimationActive={false}
            />
            {hasSelf ? (
              <Radar
                dataKey="self"
                stroke="var(--color-forest-deep)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                fill="none"
                isAnimationActive={false}
              />
            ) : null}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-forest bg-fluo/60" /> Dernière
          évaluation
        </span>
        {hasPrevious ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-forest-light/40" /> Précédente
          </span>
        ) : null}
        {hasSelf ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-forest-deep" /> {selfLabel}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
