import { ListChecks, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import type { ActionItem } from "@/lib/data/actions";
import { groupActions } from "@/lib/domain/actions";

import { ActionCard } from "./action-card";
import { ActionForm, type SkillGroup } from "./action-form";

/**
 * Plan de progrès d'un commercial (§4.8) : en retard, en cours, à faire, puis faites et abandonnées
 * (repliées). Formulaire d'ajout replié en tête.
 */
export function ActionPlan({
  actions,
  today,
  slug,
  organizationId,
  memberId,
  skillGroups,
  self,
  canManage,
}: {
  actions: ActionItem[];
  today: string;
  slug: string;
  organizationId: string;
  memberId: string;
  skillGroups: SkillGroup[];
  self: boolean;
  canManage: boolean;
}) {
  const groups = groupActions(actions, today);
  const open = [...groups.overdue, ...groups.inProgress, ...groups.todo];
  const card = (a: ActionItem) => (
    <li key={a.id}>
      <ActionCard
        action={a}
        today={today}
        slug={slug}
        organizationId={organizationId}
        skillGroups={skillGroups}
        self={self}
        canManage={canManage}
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <details
        className="group rounded-(--radius-card) border border-line bg-surface"
        open={actions.length === 0}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold text-forest-deep [&::-webkit-details-marker]:hidden">
          <Plus aria-hidden="true" className="size-5" /> Ajouter une action
        </summary>
        <div className="border-t border-line p-4">
          <ActionForm
            slug={slug}
            organizationId={organizationId}
            memberId={memberId}
            skillGroups={skillGroups}
            self={self}
          />
        </div>
      </details>

      {actions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={self ? "Ton plan est vide pour l'instant" : "Aucune action pour l'instant"}
          text={
            self
              ? "Les actions décidées en coaching arriveront ici. Tu peux aussi ajouter les tiennes."
              : "Les actions décidées en coaching arrivent ici automatiquement."
          }
        />
      ) : null}

      {groups.overdue.length ? (
        <Section title="En retard" count={groups.overdue.length} danger>
          {groups.overdue.map(card)}
        </Section>
      ) : null}
      {groups.inProgress.length ? (
        <Section title="En cours" count={groups.inProgress.length}>
          {groups.inProgress.map(card)}
        </Section>
      ) : null}
      {groups.todo.length ? (
        <Section title="À faire" count={groups.todo.length}>
          {groups.todo.map(card)}
        </Section>
      ) : null}
      {open.length === 0 && actions.length > 0 ? (
        <Card className="text-center">
          <p className="font-semibold">
            {self ? "Toutes tes actions sont faites" : "Toutes les actions sont terminées."}
          </p>
        </Card>
      ) : null}

      {groups.done.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-muted">
            Faites ({groups.done.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">{groups.done.map(card)}</ul>
        </details>
      ) : null}
      {groups.abandoned.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-muted">
            Abandonnées ({groups.abandoned.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">{groups.abandoned.map(card)}</ul>
        </details>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  danger,
  children,
}: {
  title: string;
  count: number;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className={`mb-3 text-lg font-semibold ${danger ? "text-danger" : ""}`}>
        {title} <span className="text-muted">({count})</span>
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}
