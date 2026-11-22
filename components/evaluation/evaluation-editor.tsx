"use client";

import { Check, CloudOff, Loader2, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveEvaluationDraft, validateEvaluation } from "@/app/actions/evaluations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

import { ScoreButtons } from "./score-buttons";

export type EditorSkill = {
  id: string;
  name: string;
  statement: string | null;
  levels: (string | null)[];
};
export type EditorCompetency = { id: string; name: string; skills: EditorSkill[] };
export type EditorBlock = { id: string; name: string; competencies: EditorCompetency[] };

type Entry = { score: number | null; comment: string | null };

type Props = {
  slug: string;
  evaluationId: string;
  /** brouillon à compléter, ou correction d'une évaluation validée par un responsable */
  mode: "draft" | "correction";
  blocks: EditorBlock[];
  initialScores: Record<string, Entry>;
  previousScores: Record<string, number>;
  initialGeneralComment: string | null;
  backHref: string;
  /** Tutoiement pour l'auto-évaluation du commercial (§10.1). */
  self: boolean;
};

const DEBOUNCE_MS = 1500;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Saisie d'une évaluation (§4.5) : une ligne par sous-compétence, notes 0 à 4 en gros boutons,
 * enregistrement automatique ~1,5 s après la dernière saisie, et immédiatement avant de quitter.
 */
export function EvaluationEditor(props: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, Entry>>(props.initialScores);
  const [generalComment, setGeneralComment] = useState(props.initialGeneralComment ?? "");
  const [openComments, setOpenComments] = useState<Set<string>>(
    () =>
      new Set(
        Object.entries(props.initialScores)
          .filter(([, e]) => e.comment)
          .map(([id]) => id),
      ),
  );
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [armed, setArmed] = useState(false);
  const [validating, startValidation] = useTransition();

  const pending = useRef(new Map<string, Entry>());
  const pendingComment = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) await inFlight.current;
    if (pending.current.size === 0 && pendingComment.current === null) return true;

    const scores = [...pending.current.entries()].map(([skillId, e]) => ({ skillId, ...e }));
    const comment = pendingComment.current;
    pending.current = new Map();
    pendingComment.current = null;
    setSaveState({ kind: "saving" });

    const run = (async () => {
      try {
        const result = await saveEvaluationDraft({
          evaluationId: props.evaluationId,
          scores,
          ...(comment !== null ? { generalComment: comment } : {}),
        });
        if (!result.ok) throw new Error(result.message);
        setSaveState({ kind: "saved", at: result.savedAt });
        return true;
      } catch (error) {
        // On remet les changements en attente pour le prochain essai.
        for (const s of scores) {
          if (!pending.current.has(s.skillId)) {
            pending.current.set(s.skillId, { score: s.score, comment: s.comment });
          }
        }
        if (comment !== null && pendingComment.current === null) pendingComment.current = comment;
        const message = error instanceof Error ? error.message : "Enregistrement impossible.";
        setSaveState({ kind: "error", message });
        return false;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, [props.evaluationId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  // Quitter la page : on enregistre tout de suite, et le navigateur prévient s'il reste quelque chose.
  useEffect(() => {
    const hasPending = () => pending.current.size > 0 || pendingComment.current !== null;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPending()) return;
      void flush();
      event.preventDefault();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden" && hasPending()) void flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [flush]);

  function update(skillId: string, patch: Partial<Entry>) {
    setEntries((current) => {
      const next = { score: null, comment: null, ...current[skillId], ...patch };
      pending.current.set(skillId, next);
      return { ...current, [skillId]: next };
    });
    schedule();
  }

  function updateGeneralComment(value: string) {
    setGeneralComment(value);
    pendingComment.current = value;
    schedule();
  }

  async function leave(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const ok = await flush();
    if (!ok) {
      toast.error(
        "Vos dernières notes n'ont pas pu être enregistrées. Réessayez avant de quitter.",
      );
      return;
    }
    router.push(props.backHref);
  }

  function validate() {
    startValidation(async () => {
      const saved = await flush();
      if (!saved) {
        toast.error("Enregistrement impossible : vérifiez votre connexion avant de valider.");
        return;
      }
      const result = await validateEvaluation({
        evaluationId: props.evaluationId,
        slug: props.slug,
      });
      if (!result.ok) {
        toast.error(result.message);
        setArmed(false);
        return;
      }
      toast.success(props.self ? "Auto-évaluation validée" : "Évaluation validée");
      router.push(result.redirectTo);
    });
  }

  const allSkills = props.blocks.flatMap((b) => b.competencies.flatMap((c) => c.skills));
  const rated = allSkills.filter((s) => entries[s.id]?.score != null).length;

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-bone/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-(--radius-control) sm:border lg:top-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums">
            {rated} / {allSkills.length} notées
          </p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-forest transition-all"
              style={{ width: `${allSkills.length ? (rated / allSkills.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <SaveIndicator state={saveState} correction={props.mode === "correction"} />
      </div>

      {props.mode === "correction" ? (
        <p className="rounded-(--radius-control) border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Vous corrigez une évaluation validée. Chaque modification est enregistrée dans le journal
          d&apos;activité.
        </p>
      ) : null}

      {props.blocks.map((block) => (
        <section key={block.id} aria-labelledby={`block-${block.id}`}>
          <h2 id={`block-${block.id}`} className="mb-3 text-lg font-semibold">
            {block.name}
          </h2>
          <div className="flex flex-col gap-4">
            {block.competencies.map((competency) => {
              const done = competency.skills.filter((s) => entries[s.id]?.score != null).length;
              return (
                <Card key={competency.id} className="p-0">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <h3 className="font-display font-semibold">{competency.name}</h3>
                    <span className="text-sm text-muted tabular-nums">
                      {done}/{competency.skills.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {competency.skills.map((skill) => {
                      const entry = entries[skill.id];
                      const score = entry?.score ?? null;
                      const previous = props.previousScores[skill.id];
                      const commentOpen = openComments.has(skill.id);
                      return (
                        <li key={skill.id} className="px-4 py-4" data-skill={skill.name}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold" id={`skill-${skill.id}`}>
                                {skill.name}
                              </p>
                              {skill.statement ? (
                                <p className="mt-0.5 text-sm text-muted">{skill.statement}</p>
                              ) : null}
                            </div>
                            {previous !== undefined ? (
                              <span className="shrink-0 text-xs text-muted tabular-nums">
                                Précédente : {previous}
                              </span>
                            ) : null}
                          </div>
                          <ScoreButtons
                            className="mt-3"
                            labelledBy={`skill-${skill.id}`}
                            value={score}
                            onChange={(value) => update(skill.id, { score: value })}
                          />
                          {score !== null ? (
                            <p className="mt-2 text-sm text-forest-light">
                              <span className="font-semibold">
                                {score} · {fr.levels[score as 0 | 1 | 2 | 3 | 4]}
                              </span>
                              {skill.levels[score] ? ` — ${skill.levels[score]}` : null}
                            </p>
                          ) : null}
                          {commentOpen ? (
                            <Textarea
                              aria-label={`Commentaire pour ${skill.name}`}
                              className="mt-3"
                              placeholder={
                                props.self
                                  ? "Ton commentaire (facultatif)"
                                  : "Commentaire (facultatif)"
                              }
                              defaultValue={entry?.comment ?? ""}
                              maxLength={1000}
                              onChange={(e) =>
                                update(skill.id, { comment: e.target.value || null })
                              }
                            />
                          ) : (
                            <button
                              type="button"
                              className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-forest-light hover:text-forest-deep"
                              onClick={() => setOpenComments((s) => new Set(s).add(skill.id))}
                            >
                              <MessageSquarePlus aria-hidden="true" className="size-4" />
                              Ajouter un commentaire
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <label htmlFor="general-comment" className="mb-2 block text-lg font-semibold">
          {props.self ? "Ton commentaire général" : "Commentaire général"}
        </label>
        <Textarea
          id="general-comment"
          value={generalComment}
          maxLength={4000}
          placeholder={
            props.self
              ? "Ce qui va bien, ce que tu veux travailler…"
              : "Points forts, axes de progrès, contexte…"
          }
          onChange={(e) => updateGeneralComment(e.target.value)}
        />
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href={props.backHref}
            onClick={leave}
            className="shrink-0 text-sm font-semibold whitespace-nowrap text-forest-light hover:text-forest-deep"
          >
            {props.mode === "correction" ? "Terminer" : "Finir plus tard"}
          </Link>
          {props.mode === "draft" ? (
            armed ? (
              <Button onClick={validate} disabled={validating} autoFocus>
                {validating ? "Validation…" : "Confirmer la validation"}
              </Button>
            ) : (
              <Button onClick={() => setArmed(true)} disabled={rated === 0}>
                {props.self ? "Valider mon auto-évaluation" : "Valider l'évaluation"}
              </Button>
            )
          ) : null}
        </div>
        {armed ? (
          <p className="mx-auto mt-2 max-w-5xl text-right text-xs text-muted">
            Une fois validée, l&apos;évaluation est définitive.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SaveIndicator({ state, correction }: { state: SaveState; correction: boolean }) {
  const base = "inline-flex items-center gap-1.5 text-sm";
  if (state.kind === "saving") {
    return (
      <span className={cn(base, "text-muted")} role="status">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Enregistrement…
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className={cn(base, "text-success")} role="status">
        <Check aria-hidden="true" className="size-4" />
        {correction ? "Correction enregistrée" : "Brouillon enregistré"} à {formatTime(state.at)}
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span className={cn(base, "font-semibold text-danger")} role="alert">
        <CloudOff aria-hidden="true" className="size-4" /> {state.message}
      </span>
    );
  }
  return <span className={cn(base, "text-muted")}>Enregistrement automatique</span>;
}
