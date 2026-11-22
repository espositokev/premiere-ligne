"use client";

import { ArrowDown, ArrowUp, CircleCheck, Circle, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import { updateDojo } from "@/app/actions/dojos";
import { Button } from "@/components/ui/button";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import {
  DOJO_LEVEL_LABELS,
  DOJO_LEVELS,
  dojoChecklist,
  type DojoContent,
  type DojoScenario,
} from "@/lib/domain/dojo";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

type FieldSpec<T> = {
  key: keyof T & string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
};

function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  if (item !== undefined) copy.splice(target, 0, item);
  return copy;
}

/** Liste d'éléments éditables (étapes, critères, erreurs…) : ajouter, réordonner, retirer. */
function ListEditor<T extends Record<string, unknown>>({
  id,
  items,
  onChange,
  fields,
  newItem,
  addLabel,
  itemLabel,
}: {
  id: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: FieldSpec<T>[];
  newItem: () => T;
  addLabel: string;
  itemLabel: string;
}) {
  const update = (index: number, key: string, value: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-(--radius-control) border border-line bg-bone/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted">
              {itemLabel} {index + 1}
            </span>
            <span className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Monter"
                onClick={() => onChange(move(items, index, -1))}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Descendre"
                onClick={() => onChange(move(items, index, 1))}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-danger"
                aria-label={`Retirer ${itemLabel.toLowerCase()} ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {fields.map((field) => {
              const fieldId = `${id}-${index}-${field.key}`;
              const value = String(item[field.key] ?? "");
              return (
                <Field key={field.key} label={field.label} htmlFor={fieldId}>
                  {field.multiline ? (
                    <Textarea
                      id={fieldId}
                      value={value}
                      placeholder={field.placeholder}
                      className="min-h-16"
                      onChange={(event) => update(index, field.key, event.target.value)}
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(event) => update(index, field.key, event.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...items, newItem()])}
      >
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  );
}

/** Liste simple, une ligne par élément. */
function LinesEditor({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState(value.join("\n"));
  return (
    <Field label={label} htmlFor={id} hint={hint ?? "Un élément par ligne."}>
      <Textarea
        id={id}
        value={draft}
        className="min-h-28"
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
      />
    </Field>
  );
}

function Panel({
  title,
  children,
  number,
}: {
  title: string;
  children: ReactNode;
  number?: number;
}) {
  return (
    <section className="rounded-(--radius-card) border border-line bg-surface p-4 shadow-(--shadow-card) sm:p-5">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        {number ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-fluo">
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ScenarioEditor({
  scenario,
  index,
  onChange,
  onRemove,
}: {
  scenario: DojoScenario;
  index: number;
  onChange: (scenario: DojoScenario) => void;
  onRemove: () => void;
}) {
  const id = `scenario-${index}`;
  const set = <K extends keyof DojoScenario>(key: K, value: DojoScenario[K]) =>
    onChange({ ...scenario, [key]: value });
  return (
    <details className="rounded-(--radius-control) border border-line" open={index === 0}>
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-3 font-semibold">
        {DOJO_LEVEL_LABELS[scenario.level] ?? scenario.level} — {scenario.title || "sans titre"}
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-3">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Field label="Niveau" htmlFor={`${id}-level`}>
            <Select
              id={`${id}-level`}
              value={scenario.level}
              onChange={(e) => set("level", e.target.value)}
            >
              {DOJO_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DOJO_LEVEL_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Titre du scénario" htmlFor={`${id}-title`}>
            <Input
              id={`${id}-title`}
              value={scenario.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Le client pressé qui veut aller vite"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label="Objectif pédagogique" htmlFor={`${id}-objective`}>
            <Textarea
              id={`${id}-objective`}
              value={scenario.objective ?? ""}
              className="min-h-16"
              onChange={(e) => set("objective", e.target.value)}
            />
          </Field>
          <Field label="Durée" htmlFor={`${id}-duration`}>
            <Input
              id={`${id}-duration`}
              value={scenario.duration ?? ""}
              placeholder="20 min"
              onChange={(e) => set("duration", e.target.value)}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Persona</p>
          <ListEditor
            id={`${id}-persona`}
            items={scenario.persona}
            onChange={(persona) => set("persona", persona)}
            fields={[
              {
                key: "label",
                label: "Rubrique",
                placeholder: "Profil, comportement, signal non verbal, motivation, frein…",
              },
              { key: "text", label: "Description", multiline: true },
            ]}
            newItem={() => ({ label: "", text: "" })}
            addLabel="Ajouter une rubrique"
            itemLabel="Rubrique"
          />
        </div>
        <Field label="Contexte" htmlFor={`${id}-context`}>
          <Textarea
            id={`${id}-context`}
            value={scenario.context ?? ""}
            className="min-h-16"
            onChange={(e) => set("context", e.target.value)}
          />
        </Field>
        <Field label="Enjeu" htmlFor={`${id}-stakes`}>
          <Textarea
            id={`${id}-stakes`}
            value={scenario.stakes ?? ""}
            className="min-h-16"
            onChange={(e) => set("stakes", e.target.value)}
          />
        </Field>
        <LinesEditor
          id={`${id}-observe`}
          label="Ce que le manager observe"
          value={scenario.observe}
          onChange={(observe) => set("observe", observe)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-danger"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Retirer ce scénario
        </Button>
      </div>
    </details>
  );
}

/**
 * Éditeur structuré d'un Dojo, calqué sur le standard « Créer un Dojo » :
 * chaque champ correspond à une étape de la méthode.
 */
export function DojoEditor({
  dojo,
  skills,
}: {
  dojo: { id: string; title: string; skillId: string; content: DojoContent };
  skills: { label: string; skills: { id: string; name: string }[] }[];
}) {
  const [state, action] = useActionState(updateDojo, initialFormState);
  const [title, setTitle] = useState(dojo.title);
  const [skillId, setSkillId] = useState(dojo.skillId);
  const [content, setContent] = useState<DojoContent>(dojo.content);

  const setTheory = (patch: Partial<DojoContent["theory"]>) =>
    setContent((c) => ({ ...c, theory: { ...c.theory, ...patch } }));
  const setOffline = (patch: Partial<DojoContent["offline"]>) =>
    setContent((c) => ({ ...c, offline: { ...c.offline, ...patch } }));
  const setOnline = (patch: Partial<DojoContent["online"]>) =>
    setContent((c) => ({ ...c, online: { ...c.online, ...patch } }));
  const checklist = dojoChecklist(content);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={dojo.id} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      <Panel title="L'essentiel">
        <Field label="Titre" htmlFor="dojo-title" error={state.fieldErrors?.title}>
          <Input
            id="dojo-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Accroche"
          htmlFor="dojo-tagline"
          hint="Une phrase qui dit à quoi sert le Dojo."
        >
          <Input
            id="dojo-tagline"
            value={content.tagline ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, tagline: e.target.value }))}
          />
        </Field>
        <Field label="Sous-compétence visée" htmlFor="dojo-skill">
          <Select
            id="dojo-skill"
            name="skill_id"
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
          >
            {skills.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field
            label="Objectif pédagogique"
            htmlFor="dojo-objective"
            hint="Un geste, du point de vue du commercial : « Le commercial sait… »"
          >
            <Textarea
              id="dojo-objective"
              value={content.objective ?? ""}
              className="min-h-16"
              onChange={(e) => setContent((c) => ({ ...c, objective: e.target.value }))}
            />
          </Field>
          <Field label="Durée" htmlFor="dojo-duration">
            <Input
              id="dojo-duration"
              value={content.duration ?? ""}
              placeholder="30 min"
              onChange={(e) => setContent((c) => ({ ...c, duration: e.target.value }))}
            />
          </Field>
        </div>
        <ul className="flex flex-col gap-1.5 rounded-(--radius-control) bg-bone p-3 text-sm">
          {checklist.map((item) => (
            <li
              key={item.label}
              className={cn("flex items-center gap-2", item.ok ? "text-forest-deep" : "text-muted")}
            >
              {item.ok ? (
                <CircleCheck aria-hidden="true" className="size-4 text-success" />
              ) : (
                <Circle aria-hidden="true" className="size-4" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Théorie — le standard" number={1}>
        <Field label="Titre du standard" htmlFor="theory-title">
          <Input
            id="theory-title"
            value={content.theory.standardTitle ?? ""}
            placeholder="Le standard : l'accueil en 4 gestes clés"
            onChange={(e) => setTheory({ standardTitle: e.target.value })}
          />
        </Field>
        <Field label="Introduction" htmlFor="theory-intro">
          <Textarea
            id="theory-intro"
            value={content.theory.intro ?? ""}
            className="min-h-16"
            onChange={(e) => setTheory({ intro: e.target.value })}
          />
        </Field>
        <ListEditor
          id="standard"
          items={content.theory.standard.map((s) => ({
            ...s,
            label: s.label ?? "",
            why: s.why ?? "",
          }))}
          onChange={(standard) => setTheory({ standard })}
          fields={[
            { key: "label", label: "Repère", placeholder: "< 20 SEC" },
            { key: "title", label: "Geste" },
            { key: "description", label: "Comment faire", multiline: true },
            { key: "why", label: "Pourquoi ça marche", multiline: true },
          ]}
          newItem={() => ({ label: "", title: "", description: "", why: "" })}
          addLabel="Ajouter un geste"
          itemLabel="Geste"
        />
        <h3 className="mt-2 font-semibold">Critères d&apos;excellence (4 à 6, observables)</h3>
        <ListEditor
          id="criteria"
          items={content.theory.criteria}
          onChange={(criteria) => setTheory({ criteria })}
          fields={[
            {
              key: "title",
              label: "Critère",
              placeholder: "Il ne parle pas du produit avant 2 minutes",
            },
            { key: "description", label: "Explication", multiline: true },
          ]}
          newItem={() => ({ title: "", description: "" })}
          addLabel="Ajouter un critère"
          itemLabel="Critère"
        />
        <h3 className="mt-2 font-semibold">Erreurs à éviter</h3>
        <ListEditor
          id="mistakes"
          items={content.theory.mistakes}
          onChange={(mistakes) => setTheory({ mistakes })}
          fields={[
            { key: "title", label: "Erreur" },
            { key: "description", label: "Explication", multiline: true },
          ]}
          newItem={() => ({ title: "", description: "" })}
          addLabel="Ajouter une erreur"
          itemLabel="Erreur"
        />
      </Panel>

      <Panel title="Offline — le jeu de rôle" number={2}>
        <h3 className="font-semibold">Notice du manager</h3>
        <ListEditor
          id="guide"
          items={content.offline.guide}
          onChange={(guide) => setOffline({ guide })}
          fields={[
            { key: "title", label: "Étape", placeholder: "Préparer la séance" },
            { key: "description", label: "Consigne", multiline: true },
          ]}
          newItem={() => ({ title: "", description: "" })}
          addLabel="Ajouter une étape"
          itemLabel="Étape"
        />
        <h3 className="mt-2 font-semibold">Scénarios (débutant, intermédiaire, avancé)</h3>
        <div className="flex flex-col gap-3">
          {content.offline.scenarios.map((scenario, index) => (
            <ScenarioEditor
              key={index}
              scenario={scenario}
              index={index}
              onChange={(next) =>
                setOffline({
                  scenarios: content.offline.scenarios.map((s, i) => (i === index ? next : s)),
                })
              }
              onRemove={() =>
                setOffline({ scenarios: content.offline.scenarios.filter((_, i) => i !== index) })
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              setOffline({
                scenarios: [
                  ...content.offline.scenarios,
                  {
                    level: "debutant",
                    title: "",
                    objective: null,
                    duration: null,
                    persona: [],
                    context: null,
                    stakes: null,
                    observe: [],
                  },
                ],
              })
            }
          >
            <Plus aria-hidden="true" />
            Ajouter un scénario
          </Button>
        </div>
      </Panel>

      <Panel title="Online — l'observation terrain" number={3}>
        <Field label="Ce qu'on observe uniquement" htmlFor="online-focus">
          <Input
            id="online-focus"
            value={content.online.focus ?? ""}
            placeholder="l'accueil et la prise de contact"
            onChange={(e) => setOnline({ focus: e.target.value })}
          />
        </Field>
        <LinesEditor
          id="online-points"
          label="Points d'attention"
          value={content.online.attentionPoints}
          onChange={(attentionPoints) => setOnline({ attentionPoints })}
        />
        <LinesEditor
          key={content.online.grid.join("|")}
          id="online-grid"
          label="Grille d'observation (Oui / Non / Partiel)"
          hint="4 à 8 critères, un par ligne. La grille reprend les critères d'excellence de la théorie."
          value={content.online.grid}
          onChange={(grid) => setOnline({ grid })}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            setOnline({ grid: content.theory.criteria.map((c) => c.title).filter(Boolean) })
          }
        >
          Reprendre les critères d&apos;excellence
        </Button>
        <h3 className="mt-2 font-semibold">Débriefing</h3>
        <ListEditor
          id="debrief"
          items={content.online.debrief}
          onChange={(debrief) => setOnline({ debrief })}
          fields={[
            { key: "title", label: "Temps", placeholder: "Auto-évaluation" },
            { key: "prompt", label: "Ce que dit le manager", multiline: true },
          ]}
          newItem={() => ({ title: "", prompt: "" })}
          addLabel="Ajouter un temps"
          itemLabel="Temps"
        />
      </Panel>

      <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-(--radius-card) border border-line bg-surface/95 p-3 shadow-(--shadow-card) backdrop-blur lg:bottom-4">
        <FormFeedback state={state} />
        <SubmitButton className="w-full sm:w-auto">Enregistrer le Dojo</SubmitButton>
      </div>
    </form>
  );
}
