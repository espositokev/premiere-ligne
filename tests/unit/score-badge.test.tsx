import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreBadge } from "@/components/ui/score-badge";

describe("ScoreBadge", () => {
  it("affiche le chiffre, pas seulement la couleur (accessibilité)", () => {
    render(<ScoreBadge score={3} />);
    const badge = screen.getByLabelText("Niveau 3 : Maîtrise, résultats réguliers");
    expect(badge.textContent).toBe("3");
  });

  it("affiche un tiret pour une compétence non évaluée", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByLabelText("Non évaluée").textContent).toBe("–");
  });
});
