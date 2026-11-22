"use client";

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = [
  "var(--color-forest)",
  "var(--color-fluo)",
  "var(--color-forest-light)",
  "var(--color-level-expert)",
  "var(--color-level-mid)",
  "var(--color-muted)",
];

/** Coachings clôturés par mois et par manager (§4.10). */
export function CoachingsChart({
  coaches,
  rows,
}: {
  coaches: string[];
  rows: Record<string, number | string>[];
}) {
  if (coaches.length === 0)
    return <p className="text-sm text-muted">Aucun coaching clôturé sur la période.</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "var(--color-bone)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {coaches.map((coach, i) => (
            <Bar
              key={coach}
              dataKey={coach}
              stackId="a"
              fill={COLORS[i % COLORS.length]}
              radius={i === coaches.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
