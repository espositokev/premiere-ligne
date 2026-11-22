import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const copy = fr.home;

// Aperçu illustratif d'une fiche vendeur (données fictives, uniquement pour la page d'accueil).
const masterySteps = [
  { month: "Août", value: 40 },
  { month: "Sept.", value: 48 },
  { month: "Oct.", value: 57 },
  { month: "Nov.", value: 65 },
] as const;

const previewSkills = [
  { name: "Découverte des besoins", from: 1, to: 3 },
  { name: "Traiter les objections", from: 1, to: 2 },
  { name: "Proposer un financement", from: 3, to: 4 },
] as const;

export default function HomePage() {
  const current = masterySteps[masterySteps.length - 1] ?? masterySteps[0];

  return (
    <>
      <section className="bg-forest text-bone">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:min-h-[calc(100svh-4rem)] md:grid-cols-[1fr_minmax(0,30rem)] md:py-20 lg:gap-16">
          <div>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-[-0.02em] sm:text-5xl lg:text-6xl">
              {copy.titleStart}{" "}
              <span className="underline decoration-fluo decoration-[6px] underline-offset-[10px] [text-decoration-skip-ink:none]">
                {copy.titleHighlight}
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-bone/75">{copy.lead}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <Button asChild size="lg">
                <a href={`mailto:${copy.contactEmail}`}>{copy.contact}</a>
              </Button>
              <Link
                href="/connexion"
                className="inline-flex min-h-12 items-center justify-center gap-2 font-semibold text-bone/85 transition-colors hover:text-bone"
              >
                {copy.login}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>

          <RepSheetPreview current={current.value} />
        </div>
      </section>

      <section className="bg-bone">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-[-0.01em] text-forest-deep">
              {copy.methodTitle}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted">{copy.methodLead}</p>
          </div>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {copy.pillars.map((pillar, index) => (
              <li key={pillar.title} className="border-t border-forest/15 pt-6">
                <p className="text-sm text-muted tabular-nums">0{index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold text-forest-deep">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-muted">{pillar.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

/** Fiche vendeur simplifiée : la progression monte en marches, comme le logo. */
function RepSheetPreview({ current }: { current: number }) {
  const p = copy.preview;
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl bg-surface p-6 text-forest-deep shadow-[0_24px_48px_rgb(0_0_0/0.18)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-forest/8 font-display text-sm font-semibold">
            LB
          </span>
          <div>
            <p className="font-display font-semibold">{p.name}</p>
            <p className="text-sm text-muted">{p.role}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{p.mastery}</p>
          <p className="font-display text-3xl leading-none font-semibold whitespace-nowrap tabular-nums">
            {current}&nbsp;%
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex h-28 items-end gap-1">
          {masterySteps.map((step, index) => {
            const last = index === masterySteps.length - 1;
            return (
              <div
                key={step.month}
                className={cn(
                  "flex-1 rounded-t-md",
                  last ? "bg-fluo ring-1 ring-forest/20 ring-inset" : "bg-forest/10",
                )}
                style={{ height: `${step.value * 1.5}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex gap-1 text-xs text-muted tabular-nums">
          {masterySteps.map((step) => (
            <span key={step.month} className="flex-1">
              {step.month}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-forest-light">{p.change}</p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs text-muted">{p.skillsTitle}</p>
        <ul className="mt-2">
          {previewSkills.map((skill, index) => (
            <li
              key={skill.name}
              className={cn(
                "flex items-center justify-between gap-3 py-2",
                index === 2 && "hidden sm:flex",
              )}
            >
              <span className="text-sm">{skill.name}</span>
              <span className="flex items-center gap-2">
                <ScoreBadge score={skill.from} size="sm" className="opacity-40" />
                <ArrowRight className="size-3.5 text-subtle" strokeWidth={1.75} />
                <ScoreBadge score={skill.to} size="sm" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-(--radius-control) bg-bone px-4 py-3">
        <p className="text-xs text-muted">{p.next}</p>
        <p className="mt-0.5 text-sm font-medium">{p.nextWhen}</p>
      </div>
    </div>
  );
}
