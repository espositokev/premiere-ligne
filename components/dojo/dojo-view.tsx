import { CircleCheck, Eye, Lightbulb, MessageCircle, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DOJO_LEVEL_LABELS,
  DOJO_PHASES,
  type DojoContent,
  type DojoPhase,
  type DojoScenario,
} from "@/lib/domain/dojo";
import { cn } from "@/lib/utils";

type Section = DojoContent["theory"]["sections"][number];

function Heading({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h3 className="mt-8 mb-3 flex items-center gap-2 text-lg font-semibold first:mt-0">
      {icon}
      {children}
    </h3>
  );
}

function FreeSection({ section }: { section: Section }) {
  return (
    <section className="mt-8 first:mt-0">
      <h3 className="mb-3 text-lg font-semibold">{section.title}</h3>
      {section.intro ? <p className="mb-3 text-forest-deep/90">{section.intro}</p> : null}
      {section.items?.length ? (
        <div className="flex flex-col gap-3">
          {section.items.map((item, index) => (
            <Card key={index} className="p-4">
              <p className="font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-forest-deep/90">{item.description}</p>
              ) : null}
              {item.example ? (
                <p className="mt-2 text-sm text-muted italic">{item.example}</p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
      {section.lines?.length ? (
        <Card className="p-4">
          <ul className="flex flex-col gap-2">
            {section.lines.map((line, index) => (
              <li key={index} className="leading-relaxed text-forest-deep/90">
                {line}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}

function Theory({ content }: { content: DojoContent }) {
  const { theory } = content;
  return (
    <div>
      {theory.standardTitle || theory.standard.length ? (
        <>
          <Heading icon={<Target aria-hidden="true" className="size-5 text-forest-light" />}>
            {theory.standardTitle ?? "Le standard"}
          </Heading>
          {theory.intro ? (
            <p className="mb-4 leading-relaxed text-forest-deep/90">{theory.intro}</p>
          ) : null}
          <ol className="flex flex-col gap-3">
            {theory.standard.map((step, index) => (
              <li key={index}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-bone">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      {step.label ? (
                        <Badge tone="accent" className="mb-1">
                          {step.label}
                        </Badge>
                      ) : null}
                      <p className="font-semibold">{step.title}</p>
                      {step.description ? (
                        <p className="mt-1 leading-relaxed text-forest-deep/90">
                          {step.description}
                        </p>
                      ) : null}
                      {step.why ? (
                        <p className="mt-2 flex gap-2 text-sm text-muted">
                          <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                          <span>{step.why}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {theory.sections.map((section, index) => (
        <FreeSection key={index} section={section} />
      ))}

      {theory.criteria.length ? (
        <>
          <Heading icon={<CircleCheck aria-hidden="true" className="size-5 text-success" />}>
            Les critères d&apos;excellence
          </Heading>
          <ul className="flex flex-col gap-3">
            {theory.criteria.map((criterion, index) => (
              <li
                key={index}
                className="rounded-(--radius-card) border-l-4 border-success bg-surface p-4 shadow-(--shadow-card)"
              >
                <p className="font-semibold">{criterion.title}</p>
                {criterion.description ? (
                  <p className="mt-1 text-forest-deep/90">{criterion.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {theory.mistakes.length ? (
        <>
          <Heading icon={<TriangleAlert aria-hidden="true" className="size-5 text-danger" />}>
            Les erreurs à éviter
          </Heading>
          <ul className="flex flex-col gap-3">
            {theory.mistakes.map((mistake, index) => (
              <li
                key={index}
                className="rounded-(--radius-card) border-l-4 border-danger bg-surface p-4 shadow-(--shadow-card)"
              >
                <p className="font-semibold">{mistake.title}</p>
                {mistake.description ? (
                  <p className="mt-1 text-forest-deep/90">{mistake.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function Scenario({ scenario }: { scenario: DojoScenario }) {
  const tone =
    scenario.level === "avance"
      ? "danger"
      : scenario.level === "intermediaire"
        ? "warning"
        : "success";
  return (
    <details
      className="group rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)"
      open={scenario.level === "debutant"}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Badge tone={tone}>{DOJO_LEVEL_LABELS[scenario.level] ?? scenario.level}</Badge>
        <span className="min-w-0 flex-1 font-semibold">{scenario.title}</span>
        {scenario.duration ? (
          <span className="shrink-0 text-sm text-muted">{scenario.duration}</span>
        ) : null}
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4">
        {scenario.objective ? (
          <p className="rounded-(--radius-control) bg-fluo/40 p-3 text-sm">
            <strong>Objectif : </strong>
            {scenario.objective}
          </p>
        ) : null}
        {scenario.persona.length ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {scenario.persona.map((item, index) => (
              <div key={index}>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {item.label}
                </dt>
                <dd className="mt-0.5 leading-relaxed">{item.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {scenario.context ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Contexte</p>
            <p className="mt-0.5 leading-relaxed">{scenario.context}</p>
            {scenario.stakes ? (
              <p className="mt-2 leading-relaxed text-forest-deep/90">{scenario.stakes}</p>
            ) : null}
          </div>
        ) : null}
        {scenario.observe.length ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
              <Eye aria-hidden="true" className="size-4" />
              Ce que le manager observe
            </p>
            <ul className="flex flex-col gap-2">
              {scenario.observe.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-forest"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function Offline({ content }: { content: DojoContent }) {
  const { offline } = content;
  return (
    <div>
      {offline.guide.length ? (
        <>
          <Heading>Notice du manager</Heading>
          <ol className="flex flex-col gap-3">
            {offline.guide.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fluo font-display text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-0.5 leading-relaxed text-forest-deep/90">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {offline.scenarios.length ? (
        <>
          <Heading>Les scénarios</Heading>
          <div className="flex flex-col gap-3">
            {offline.scenarios.map((scenario, index) => (
              <Scenario key={index} scenario={scenario} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Online({ content }: { content: DojoContent }) {
  const { online } = content;
  return (
    <div>
      {online.focus || online.attentionPoints.length ? (
        <>
          <Heading icon={<Eye aria-hidden="true" className="size-5 text-forest-light" />}>
            Fiche d&apos;aide à l&apos;écoute
          </Heading>
          {online.focus ? (
            <p className="mb-3 rounded-(--radius-control) bg-fluo/40 p-3">
              Observer <strong>uniquement</strong> : {online.focus}
            </p>
          ) : null}
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {online.attentionPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ol>
        </>
      ) : null}
      {online.grid.length ? (
        <>
          <Heading>Grille d&apos;observation</Heading>
          <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-bone">
                <tr>
                  <th scope="col" className="p-3 font-semibold">
                    Critère observé
                  </th>
                  {["Oui", "Non", "Partiel"].map((label) => (
                    <th key={label} scope="col" className="w-16 p-3 text-center font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {online.grid.map((criterion, index) => (
                  <tr key={index}>
                    <td className="p-3">{criterion}</td>
                    {[0, 1, 2].map((cell) => (
                      <td key={cell} className="p-3 text-center">
                        <span
                          aria-hidden="true"
                          className="inline-block size-5 rounded border border-line"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {online.debrief.length ? (
        <>
          <Heading icon={<MessageCircle aria-hidden="true" className="size-5 text-forest-light" />}>
            Débriefing après l&apos;écoute
          </Heading>
          <ol className="flex flex-col gap-3">
            {online.debrief.map((step, index) => (
              <li key={index}>
                <Card className="p-4">
                  <p className="font-semibold">
                    {index + 1}. {step.title}
                  </p>
                  {step.prompt ? (
                    <p className="mt-1 leading-relaxed text-forest-deep/90 italic">{step.prompt}</p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {online.sections.map((section, index) => (
        <FreeSection key={index} section={section} />
      ))}
    </div>
  );
}

/** Lecture d'un Dojo, une phase à la fois : pensée pour être suivie sur téléphone pendant la séance. */
export function DojoView({
  content,
  phase,
  baseHref,
}: {
  content: DojoContent;
  phase: DojoPhase;
  baseHref: string;
}) {
  return (
    <div>
      {content.objective ? (
        <Card className="mb-6 border-forest bg-forest text-bone">
          <p className="text-xs font-semibold tracking-wide text-fluo uppercase">
            Objectif pédagogique
          </p>
          <p className="mt-1 text-lg leading-snug">{content.objective}</p>
          {content.duration ? (
            <p className="mt-2 text-sm text-bone/75">Durée : {content.duration}</p>
          ) : null}
        </Card>
      ) : null}

      <nav
        aria-label="Phases du Dojo"
        className="sticky top-14 z-10 -mx-4 mb-6 bg-bone/95 px-4 py-2 backdrop-blur lg:top-0"
      >
        <ol className="grid grid-cols-3 gap-2">
          {DOJO_PHASES.map((item) => {
            const active = item.key === phase;
            return (
              <li key={item.key}>
                <Link
                  href={`${baseHref}?phase=${item.key}`}
                  scroll={false}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-(--radius-control) border px-2 text-center",
                    active
                      ? "border-forest bg-forest text-bone"
                      : "border-line bg-surface text-forest-deep",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-xs font-bold",
                      active ? "text-fluo" : "text-muted",
                    )}
                  >
                    Phase {item.number}
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {phase === "theorie" ? <Theory content={content} /> : null}
      {phase === "offline" ? <Offline content={content} /> : null}
      {phase === "online" ? <Online content={content} /> : null}

      {content.takeaways && phase === "online" ? (
        <Card className="mt-8 border-dashed">
          <p className="font-display font-semibold">Ce qu&apos;on retient</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-forest-deep/90">
            {content.takeaways.theory ? <li>1 · {content.takeaways.theory}</li> : null}
            {content.takeaways.offline ? <li>2 · {content.takeaways.offline}</li> : null}
            {content.takeaways.online ? <li>3 · {content.takeaways.online}</li> : null}
          </ul>
          {content.takeaways.next ? (
            <p className="mt-3 text-sm font-semibold">{content.takeaways.next}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
