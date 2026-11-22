import { Card } from "@/components/ui/card";
import type { LatestScore, RadarPoint } from "@/lib/domain/evaluation";
import type { FrameworkTree } from "@/lib/domain/framework";

import { SkillMatrix } from "./skill-matrix";
import { SkillRadar } from "./skill-radar";

/** Radar + matrice : le cœur de la fiche commercial et de « Ma progression ». */
export function MemberProgress({
  tree,
  radar,
  latest,
  self,
  selfVoice = false,
}: {
  tree: FrameworkTree;
  radar: RadarPoint[];
  latest: Map<string, LatestScore>;
  self: Map<string, LatestScore>;
  selfVoice?: boolean;
}) {
  const hasScores = latest.size > 0 || self.size > 0;
  return (
    <div className="flex flex-col gap-6">
      {hasScores && radar.length >= 3 ? (
        <Card>
          <h2 className="font-display text-lg font-semibold">
            {selfVoice ? "Ton radar de compétences" : "Radar des compétences"}
          </h2>
          <p className="text-sm text-muted">Moyenne de chaque compétence, sur 4.</p>
          <SkillRadar
            points={radar}
            selfLabel={selfVoice ? "Mon auto-évaluation" : "Auto-évaluation"}
          />
        </Card>
      ) : null}
      <SkillMatrix tree={tree} latest={latest} self={self} selfLabel={selfVoice ? "Moi" : "Auto"} />
    </div>
  );
}
