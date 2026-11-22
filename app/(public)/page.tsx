import { ClipboardCheck, Dumbbell, type LucideIcon, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { fr } from "@/lib/i18n/fr";

const pillarIcons: readonly LucideIcon[] = [ClipboardCheck, MessagesSquare, Dumbbell];

// Aperçu illustratif de la matrice (données fictives, uniquement pour la page d'accueil).
const previewSkills: { name: string; score: number | null; trend: "up" | "same" | null }[] = [
  { name: "Accueil personnalisé", score: 3, trend: "up" },
  { name: "Découverte complète", score: 2, trend: "up" },
  { name: "Traiter les objections", score: 1, trend: "same" },
  { name: "Proposer un financement", score: 4, trend: "same" },
  { name: "Livraison & fidélisation", score: null, trend: null },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-forest text-bone">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-fluo">
              <span aria-hidden="true" className="h-1 w-6 bg-fluo" />
              {fr.brand.tagline}
            </p>
            <h1 className="text-3xl leading-tight font-semibold sm:text-4xl md:text-5xl">
              {fr.home.title}
            </h1>
            <p className="mt-5 max-w-prose text-lg text-bone/80">{fr.home.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/connexion">{fr.home.login}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border border-bone/30 text-bone hover:bg-bone/10"
              >
                <a href={`mailto:${fr.home.contactEmail}`}>{fr.home.contact}</a>
              </Button>
            </div>
          </div>

          <Card className="border-forest-light bg-surface text-forest-deep" aria-hidden="true">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Léo, vendeur</p>
                <p className="text-sm text-muted">Dernière évaluation il y a 12 jours</p>
              </div>
              <p className="font-display text-3xl font-semibold">
                40<span className="text-lg">%</span>
              </p>
            </div>
            <ul className="divide-y divide-line">
              {previewSkills.map((skill) => (
                <li key={skill.name} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm">{skill.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-center text-sm text-muted">
                      {skill.trend === "up" ? "↑" : skill.trend === "same" ? "=" : ""}
                    </span>
                    <ScoreBadge score={skill.score} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {fr.home.pillars.map((pillar, index) => {
            const Icon = pillarIcons[index] ?? ClipboardCheck;
            return (
              <Card key={pillar.title}>
                <span className="mb-4 inline-flex text-forest-light">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{pillar.title}</CardTitle>
                <CardDescription className="mt-2">{pillar.text}</CardDescription>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
