"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { addNode, deleteNode, moveNode, setNodeActive, updateNode } from "@/app/actions/frameworks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ConfirmSubmitButton,
  Field,
  FormFeedback,
  SubmitButton,
} from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import {
  LEVEL_KEYS,
  NODE_LABELS,
  type BlockNode,
  type CompetencyNode,
  type FrameworkTree,
  type NodeKind,
  type SkillNode,
} from "@/lib/domain/framework";
import { fr } from "@/lib/i18n/fr";
import { initialFormState, type FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

type EditorContext = {
  scope: "template" | "org";
  /** Page à rafraîchir après chaque modification. */
  path: string;
  usedSkillIds: Set<string>;
  showInactive: boolean;
};

type ServerAction = (prev: FormState, formData: FormData) => Promise<FormState>;

function ContextFields({ ctx, kind }: { ctx: EditorContext; kind: NodeKind }) {
  return (
    <>
      <input type="hidden" name="scope" value={ctx.scope} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="path" value={ctx.path} />
    </>
  );
}

/** Affiche en toast le résultat d'une petite action (monter, désactiver…). */
function useToastResult(state: FormState) {
  const last = useRef<FormState | null>(null);
  useEffect(() => {
    if (state === last.current || state.status === "idle") return;
    last.current = state;
    if (state.status === "error" && state.message) toast.error(state.message);
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);
}

function MiniAction({
  action,
  fields,
  ctx,
  kind,
  children,
  label,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  ctx: EditorContext;
  kind: NodeKind;
  children: ReactNode;
  label: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  useToastResult(state);
  return (
    <form action={formAction}>
      <ContextFields ctx={ctx} kind={kind} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton
        variant="outline"
        size="icon"
        aria-label={label}
        title={label}
        pendingLabel="…"
        className="size-9"
      >
        {children}
      </SubmitButton>
    </form>
  );
}

function NodeActions({
  ctx,
  kind,
  id,
  active,
  deletable,
}: {
  ctx: EditorContext;
  kind: NodeKind;
  id: string;
  active: boolean;
  deletable: boolean;
}) {
  const [toggleState, toggle] = useActionState(setNodeActive, initialFormState);
  const [deleteState, remove] = useActionState(deleteNode, initialFormState);
  useToastResult(toggleState);
  useToastResult(deleteState);
  const label = NODE_LABELS[kind].one;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MiniAction
        action={moveNode}
        fields={{ id, direction: "up" }}
        ctx={ctx}
        kind={kind}
        label={`Monter la ${label}`}
      >
        <ArrowUp aria-hidden="true" />
      </MiniAction>
      <MiniAction
        action={moveNode}
        fields={{ id, direction: "down" }}
        ctx={ctx}
        kind={kind}
        label={`Descendre la ${label}`}
      >
        <ArrowDown aria-hidden="true" />
      </MiniAction>
      {ctx.scope === "org" ? (
        <form action={toggle}>
          <ContextFields ctx={ctx} kind={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <SubmitButton variant="ghost" size="sm">
            {active ? "Désactiver" : "Réactiver"}
          </SubmitButton>
        </form>
      ) : null}
      {deletable ? (
        <form action={remove}>
          <ContextFields ctx={ctx} kind={kind} />
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmitButton
            label="Supprimer"
            confirmLabel="Confirmer la suppression"
            variant="ghost"
          />
        </form>
      ) : ctx.scope === "org" ? (
        <span className="text-xs text-muted">Déjà utilisée : désactivation seulement</span>
      ) : null}
    </div>
  );
}

function NodeForm({
  ctx,
  kind,
  node,
  parentId,
  onDone,
}: {
  ctx: EditorContext;
  kind: NodeKind;
  node?: { id: string; name: string; statement?: string | null; levels?: SkillNode["levels"] };
  parentId?: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(node ? updateNode : addNode, initialFormState);
  const errors = state.fieldErrors ?? {};
  const prefix = `${kind}-${node?.id ?? `new-${parentId}`}`;

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  return (
    <form key={node ? node.id : (state.nonce ?? 0)} action={action} className="flex flex-col gap-3">
      <ContextFields ctx={ctx} kind={kind} />
      {node ? (
        <input type="hidden" name="id" value={node.id} />
      ) : (
        <input type="hidden" name="parent_id" value={parentId} />
      )}
      <Field
        label={kind === "block" ? "Nom du bloc" : "Nom court"}
        htmlFor={`${prefix}-name`}
        error={errors.name}
      >
        <Input id={`${prefix}-name`} name="name" defaultValue={node?.name ?? ""} required />
      </Field>
      {kind !== "block" ? (
        <Field
          label={
            kind === "competency"
              ? "Énoncé de la compétence"
              : "Énoncé (ce que le commercial sait faire)"
          }
          htmlFor={`${prefix}-statement`}
          error={errors.statement}
        >
          <Textarea
            id={`${prefix}-statement`}
            name="statement"
            defaultValue={node?.statement ?? ""}
            className="min-h-16"
            placeholder="Je sais…"
          />
        </Field>
      ) : null}
      {kind === "skill" ? (
        <details className="rounded-(--radius-control) border border-line">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
            Ce que veut dire chaque niveau (facultatif)
          </summary>
          <div className="flex flex-col gap-3 border-t border-line p-3">
            {LEVEL_KEYS.map((key, level) => (
              <Field
                key={key}
                label={`${level} — ${fr.levels[level as 0 | 1 | 2 | 3 | 4]}`}
                htmlFor={`${prefix}-${key}`}
                error={errors[key]}
              >
                <Textarea
                  id={`${prefix}-${key}`}
                  name={key}
                  defaultValue={node?.levels?.[key] ?? ""}
                  className="min-h-14"
                  placeholder="Comportement observable à ce niveau…"
                />
              </Field>
            ))}
          </div>
        </details>
      ) : null}
      <FormFeedback state={state} />
      <div>
        <SubmitButton size="sm">{node ? "Enregistrer" : NODE_LABELS[kind].add}</SubmitButton>
      </div>
    </form>
  );
}

function AddNode({
  ctx,
  kind,
  parentId,
}: {
  ctx: EditorContext;
  kind: NodeKind;
  parentId: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={details}
      className="group rounded-(--radius-control) border border-dashed border-line"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-forest-light [&::-webkit-details-marker]:hidden">
        <Plus aria-hidden="true" className="size-4" />
        {NODE_LABELS[kind].add}
      </summary>
      <div className="border-t border-line p-3">
        <NodeForm ctx={ctx} kind={kind} parentId={parentId} />
      </div>
    </details>
  );
}

function visible<T extends { active: boolean }>(items: T[], ctx: EditorContext) {
  return ctx.showInactive ? items : items.filter((item) => item.active);
}

function SkillItem({ skill, ctx }: { skill: SkillNode; ctx: EditorContext }) {
  return (
    <details className="group rounded-(--radius-control) border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-semibold", !skill.active && "text-muted")}>
            {skill.name}
            {!skill.active ? (
              <Badge tone="muted" className="ml-2">
                Désactivée
              </Badge>
            ) : null}
          </span>
          {skill.statement ? (
            <span className="block text-sm text-muted">{skill.statement}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-3">
        <NodeForm ctx={ctx} kind="skill" node={skill} />
        <NodeActions
          ctx={ctx}
          kind="skill"
          id={skill.id}
          active={skill.active}
          deletable={ctx.scope === "template" || !ctx.usedSkillIds.has(skill.id)}
        />
      </div>
    </details>
  );
}

function CompetencyItem({
  competency,
  index,
  ctx,
}: {
  competency: CompetencyNode;
  index: number;
  ctx: EditorContext;
}) {
  const skills = visible(competency.skills, ctx);
  const used = competency.skills.some((s) => ctx.usedSkillIds.has(s.id));
  return (
    <details className="group rounded-(--radius-card) border border-line bg-bone/50">
      <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest font-display text-xs font-semibold text-bone">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "flex flex-wrap items-center gap-2 font-semibold",
              !competency.active && "text-muted",
            )}
          >
            {competency.name}
            {!competency.active ? <Badge tone="muted">Désactivée</Badge> : null}
          </span>
          {competency.statement ? (
            <span className="block text-sm text-muted">{competency.statement}</span>
          ) : null}
          <span className="mt-1 block text-xs font-semibold text-muted">
            {skills.length} sous-compétence{skills.length > 1 ? "s" : ""}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="mt-1 size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-3">
        <div className="flex flex-col gap-2">
          {skills.map((skill) => (
            <SkillItem key={skill.id} skill={skill} ctx={ctx} />
          ))}
          <AddNode ctx={ctx} kind="skill" parentId={competency.id} />
        </div>
        <details className="rounded-(--radius-control) border border-line bg-surface">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
            Modifier la compétence
          </summary>
          <div className="flex flex-col gap-4 border-t border-line p-3">
            <NodeForm ctx={ctx} kind="competency" node={competency} />
            <NodeActions
              ctx={ctx}
              kind="competency"
              id={competency.id}
              active={competency.active}
              deletable={!used}
            />
          </div>
        </details>
      </div>
    </details>
  );
}

function BlockCard({ block, ctx }: { block: BlockNode; ctx: EditorContext }) {
  const competencies = visible(block.competencies, ctx);
  const used = block.competencies.some((c) => c.skills.some((s) => ctx.usedSkillIds.has(s.id)));
  return (
    <section
      className={cn(
        "rounded-(--radius-card) border border-line bg-surface p-4",
        !block.active && "opacity-70",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden="true" className="h-1 w-5 bg-fluo" />
          {block.name}
          {!block.active ? <Badge tone="muted">Désactivé</Badge> : null}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {competencies.map((competency, index) => (
          <CompetencyItem key={competency.id} competency={competency} index={index} ctx={ctx} />
        ))}
        <AddNode ctx={ctx} kind="competency" parentId={block.id} />
      </div>
      <details className="mt-3 rounded-(--radius-control) border border-line">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
          Modifier le bloc
        </summary>
        <div className="flex flex-col gap-4 border-t border-line p-3">
          <NodeForm ctx={ctx} kind="block" node={block} />
          <NodeActions
            ctx={ctx}
            kind="block"
            id={block.id}
            active={block.active}
            deletable={!used}
          />
        </div>
      </details>
    </section>
  );
}

/**
 * Éditeur de référentiel (modèle ou entreprise). Pensé pour le terrain :
 * tout se replie, chaque modification s'enregistre seule, au pouce.
 */
export function FrameworkEditor({
  tree,
  scope,
  path,
  usedSkillIds = [],
  showInactive = false,
}: {
  tree: FrameworkTree;
  scope: "template" | "org";
  path: string;
  usedSkillIds?: string[];
  showInactive?: boolean;
}) {
  const ctx: EditorContext = { scope, path, usedSkillIds: new Set(usedSkillIds), showInactive };
  const blocks = visible(tree.blocks, ctx);
  const inactiveCount =
    tree.blocks.filter((b) => !b.active).length +
    tree.blocks.flatMap((b) => b.competencies).filter((c) => !c.active).length +
    tree.blocks
      .flatMap((b) => b.competencies)
      .flatMap((c) => c.skills)
      .filter((s) => !s.active).length;

  return (
    <div className="flex flex-col gap-4">
      {scope === "org" && inactiveCount > 0 ? (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href={showInactive ? path : `${path}?desactives=1`}>
            {showInactive
              ? "Masquer les éléments désactivés"
              : `Afficher les désactivés (${inactiveCount})`}
          </Link>
        </Button>
      ) : null}
      {blocks.map((block) => (
        <BlockCard key={block.id} block={block} ctx={ctx} />
      ))}
      <AddNode ctx={ctx} kind="block" parentId={tree.id} />
    </div>
  );
}
