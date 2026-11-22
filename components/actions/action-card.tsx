"use client";

import { CalendarClock, Check, MoreHorizontal, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteAction, setActionStatus } from "@/app/actions/progress-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/form-controls";
import type { ActionItem } from "@/lib/data/actions";
import {
  ACTION_STATUS_LABELS,
  canDeleteAction,
  dueLabel,
  isDueSoon,
  isOverdue,
  quickTransitions,
  type ActionStatus,
} from "@/lib/domain/actions";
import { cn } from "@/lib/utils";

import { ActionForm, type SkillGroup } from "./action-form";

const QUICK: Record<ActionStatus, { self: string; other: string; icon: typeof Check }> = {
  en_cours: { self: "Je commence", other: "Commencer", icon: Play },
  faite: { self: "C'est fait", other: "Fait", icon: Check },
  a_faire: { self: "Rouvrir", other: "Rouvrir", icon: RotateCcw },
  abandonnee: { self: "Abandonner", other: "Abandonner", icon: RotateCcw },
};

function StatusButton({
  slug,
  actionId,
  status,
  label,
  primary,
  icon: Icon,
}: {
  slug: string;
  actionId: string;
  status: ActionStatus;
  label: string;
  primary?: boolean;
  icon?: typeof Check;
}) {
  return (
    <form action={setActionStatus}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="action_id" value={actionId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={primary ? "primary" : "outline"}>
        {Icon ? <Icon aria-hidden="true" /> : null}
        {label}
      </Button>
    </form>
  );
}

/** Une action : statut, échéance, compétence, origine, et changement de statut en un tap. */
export function ActionCard({
  action,
  today,
  slug,
  organizationId,
  skillGroups,
  self,
  canManage,
  showSubject,
  memberHref,
}: {
  action: ActionItem;
  today: string;
  slug: string;
  organizationId: string;
  skillGroups: SkillGroup[];
  self: boolean;
  canManage: boolean;
  showSubject?: boolean;
  memberHref?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const overdue = isOverdue(action, today);
  const soon = isDueSoon(action, today);
  const closed = action.status === "faite" || action.status === "abandonnee";
  const due = dueLabel(action, today);
  const deletable = canDeleteAction({ source: action.source, isSubject: self, canManage });

  if (editing) {
    return (
      <div className="rounded-(--radius-card) border border-forest bg-surface p-4">
        <ActionForm
          slug={slug}
          organizationId={organizationId}
          memberId={action.subjectMembershipId}
          skillGroups={skillGroups}
          self={self}
          action={action}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <article
      className={cn(
        "rounded-(--radius-card) border bg-surface p-4",
        overdue ? "border-danger/50 bg-danger/[0.03]" : "border-line",
      )}
      data-action={action.title}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {showSubject ? (
            memberHref ? (
              <Link
                href={memberHref}
                className="text-sm font-semibold text-forest-light hover:underline"
              >
                {action.subjectName}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-forest-light">{action.subjectName}</p>
            )
          ) : null}
          <h3 className={cn("font-semibold", closed && "text-muted line-through decoration-1")}>
            {action.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {due ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue
                    ? "font-semibold text-danger"
                    : soon
                      ? "font-semibold text-warning"
                      : "text-muted",
                )}
              >
                <CalendarClock aria-hidden="true" className="size-3.5" />
                {due}
              </span>
            ) : null}
            {action.skillName ? <span className="text-muted">{action.skillName}</span> : null}
            {action.source === "coaching" && action.coachingId ? (
              <Link
                href={`/e/${slug}/coachings/${action.coachingId}`}
                className="text-forest-light hover:underline"
              >
                Issue d&apos;un coaching
              </Link>
            ) : null}
          </div>
          {action.description ? (
            <p className="mt-2 text-sm whitespace-pre-line">{action.description}</p>
          ) : null}
        </div>
        <Badge
          tone={
            overdue
              ? "danger"
              : action.status === "faite"
                ? "success"
                : action.status === "en_cours"
                  ? "accent"
                  : "muted"
          }
        >
          {overdue ? "En retard" : ACTION_STATUS_LABELS[action.status]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {quickTransitions(action.status).map((status) => (
          <StatusButton
            key={status}
            slug={slug}
            actionId={action.id}
            status={status}
            label={QUICK[status][self ? "self" : "other"]}
            icon={QUICK[status].icon}
            primary={status === "faite"}
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={menu}
          aria-label={`Plus d'options pour « ${action.title} »`}
          onClick={() => setMenu((m) => !m)}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </div>
      {menu ? (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          {!closed ? (
            <StatusButton slug={slug} actionId={action.id} status="abandonnee" label="Abandonner" />
          ) : null}
          {deletable ? (
            <form action={deleteAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="action_id" value={action.id} />
              <ConfirmSubmitButton
                label="Supprimer"
                confirmLabel="Confirmer la suppression"
                variant="ghost"
                size="sm"
              />
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
