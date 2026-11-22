/**
 * Plan de progrès (§4.8, §6.6), en fonctions pures.
 */

export type ActionStatus = "a_faire" | "en_cours" | "faite" | "abandonnee";
export type ActionSource = "coaching" | "evaluation" | "manuelle";

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  faite: "Faite",
  abandonnee: "Abandonnée",
};

export const ACTION_SOURCE_LABELS: Record<ActionSource, string> = {
  coaching: "Coaching",
  evaluation: "Évaluation",
  manuelle: "Ajoutée",
};

type Timing = { status: ActionStatus; dueDate: string | null };

/** En retard : échéance passée (avant aujourd'hui) et action ni faite ni abandonnée (§6.6). */
export function isOverdue(action: Timing, today: string): boolean {
  return (
    action.dueDate !== null &&
    action.dueDate < today &&
    (action.status === "a_faire" || action.status === "en_cours")
  );
}

/** Échéance proche : aujourd'hui ou dans les 7 prochains jours, action ouverte. */
export function isDueSoon(action: Timing, today: string): boolean {
  if (action.dueDate === null || isOverdue(action, today)) return false;
  if (action.status !== "a_faire" && action.status !== "en_cours") return false;
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 7);
  return action.dueDate <= limit.toISOString().slice(0, 10);
}

/** Tri par échéance, les actions sans échéance en dernier. */
function byDueDate<T extends Timing & { createdAt: string }>(a: T, b: T): number {
  if (a.dueDate === b.dueDate) return a.createdAt.localeCompare(b.createdAt);
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

/**
 * Regroupement par statut (§4.8) : en retard d'abord, puis en cours, à faire, faites et abandonnées.
 * Les actions ouvertes sont triées par échéance ; les terminées, de la plus récente à la plus ancienne.
 */
export function groupActions<
  T extends Timing & { createdAt: string; doneAt?: string | null; updatedAt?: string | null },
>(actions: T[], today: string) {
  const open = actions.filter((a) => a.status === "a_faire" || a.status === "en_cours");
  const recent = (a: T) => a.doneAt ?? a.updatedAt ?? a.createdAt;
  return {
    overdue: open.filter((a) => isOverdue(a, today)).sort(byDueDate),
    inProgress: open.filter((a) => a.status === "en_cours" && !isOverdue(a, today)).sort(byDueDate),
    todo: open.filter((a) => a.status === "a_faire" && !isOverdue(a, today)).sort(byDueDate),
    done: actions
      .filter((a) => a.status === "faite")
      .sort((a, b) => recent(b).localeCompare(recent(a))),
    abandoned: actions
      .filter((a) => a.status === "abandonnee")
      .sort((a, b) => recent(b).localeCompare(recent(a))),
  };
}

export function countOverdue(actions: Timing[], today: string): number {
  return actions.filter((a) => isOverdue(a, today)).length;
}

/** Boutons de changement rapide de statut, dans l'ordre d'affichage. */
export function quickTransitions(status: ActionStatus): ActionStatus[] {
  switch (status) {
    case "a_faire":
      return ["en_cours", "faite"];
    case "en_cours":
      return ["faite"];
    case "faite":
    case "abandonnee":
      return ["a_faire"];
  }
}

/** Qui peut supprimer une action (même règle que la base) : qui encadre le commercial, ou le commercial pour ses ajouts. */
export function canDeleteAction(input: {
  source: ActionSource;
  isSubject: boolean;
  canManage: boolean;
}): boolean {
  return input.canManage || (input.isSubject && input.source === "manuelle");
}

/** « Échéance le 5 décembre » / « Échéance aujourd'hui » / « En retard de 3 jours ». */
export function dueLabel(action: Timing, today: string): string | null {
  if (!action.dueDate) return null;
  const days = Math.round(
    (Date.parse(`${action.dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
  if (isOverdue(action, today)) return `En retard de ${-days} jour${-days > 1 ? "s" : ""}`;
  if (action.status === "faite" || action.status === "abandonnee") {
    return `Échéance le ${formatDay(action.dueDate)}`;
  }
  if (days === 0) return "Échéance aujourd'hui";
  if (days === 1) return "Échéance demain";
  return `Échéance le ${formatDay(action.dueDate)}`;
}

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Comptes rendus récents que le commercial n'a pas encore commentés (« à lire »). */
export function reportsToRead<
  T extends { status: string; closedAt: string | null; repComment: string | null },
>(coachings: T[], now: Date, days = 14): T[] {
  const since = now.getTime() - days * 86_400_000;
  return coachings
    .filter(
      (c) =>
        c.status === "cloture" && c.closedAt && Date.parse(c.closedAt) >= since && !c.repComment,
    )
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
}
