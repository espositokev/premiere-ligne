"use client";

import { Check, CloudOff, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { closeCoaching, saveCoachingReport } from "@/app/actions/coachings";
import { ScoreButtons } from "@/components/evaluation/score-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import type { ActionPlanItem } from "@/lib/domain/coaching";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type Observation = { score: number | null; comment: string | null };
type Texts = { context: string; strengths: string; improvements: string };
type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string };

const DEBOUNCE_MS = 1500;

/**
 * Compte rendu de coaching (§4.7), enregistré automatiquement comme les évaluations.
 * La clôture est en deux temps et n'est possible qu'une fois le coaching commencé.
 */
export function ReportEditor(props: {
  slug: string;
  coachingId: string;
  targetSkills: { id: string; name: string; levels: (string | null)[] }[];
  skillOptions: { id: string; name: string }[];
  initialTexts: Texts;
  initialObservations: Record<string, Observation>;
  initialPlan: ActionPlanItem[];
  canCloseNow: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [texts, setTexts] = useState<Texts>(props.initialTexts);
  const [observations, setObservations] = useState(props.initialObservations);
  const [plan, setPlan] = useState<ActionPlanItem[]>(props.initialPlan);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [armed, setArmed] = useState(false);
  const [closing, startClosing] = useTransition();

  const pendingTexts = useRef<Partial<Texts>>({});
  const pendingObs = useRef(new Map<string, Observation>());
  const pendingPlan = useRef<ActionPlanItem[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const hasPending = () =>
    Object.keys(pendingTexts.current).length > 0 ||
    pendingObs.current.size > 0 ||
    pendingPlan.current !== null;

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) await inFlight.current;
    if (!hasPending()) return true;

    const textChanges = pendingTexts.current;
    const obsChanges = [...pendingObs.current.entries()].map(([skillId, o]) => ({ skillId, ...o }));
    const planChange = pendingPlan.current;
    pendingTexts.current = {};
    pendingObs.current = new Map();
    pendingPlan.current = null;
    setSaveState({ kind: "saving" });

    const run = (async () => {
      const result = await saveCoachingReport({
        coachingId: props.coachingId,
        ...textChanges,
        ...(obsChanges.length ? { observations: obsChanges } : {}),
        // Les actions sans titre restent en préparation à l'écran, sans être enregistrées.
        ...(planChange ? { actionPlan: planChange.filter((a) => a.title.trim()) } : {}),
      }).catch(() => ({
        ok: false as const,
        message: "Enregistrement impossible. Vérifiez votre connexion.",
      }));
      if (result.ok) {
        setSaveState({ kind: "saved", at: result.savedAt });
        return true;
      }
      pendingTexts.current = { ...textChanges, ...pendingTexts.current };
      for (const o of obsChanges) {
        if (!pendingObs.current.has(o.skillId))
          pendingObs.current.set(o.skillId, { score: o.score, comment: o.comment });
      }
      if (planChange && pendingPlan.current === null) pendingPlan.current = planChange;
      setSaveState({ kind: "error", message: result.message });
      return false;
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, [props.coachingId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => {
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

  function setText(key: keyof Texts, value: string) {
    setTexts((t) => ({ ...t, [key]: value }));
    pendingTexts.current[key] = value;
    schedule();
  }

  function setObservation(skillId: string, patch: Partial<Observation>) {
    setObservations((current) => {
      const next = { score: null, comment: null, ...current[skillId], ...patch };
      pendingObs.current.set(skillId, next);
      return { ...current, [skillId]: next };
    });
    schedule();
  }

  function updatePlan(next: ActionPlanItem[]) {
    setPlan(next);
    pendingPlan.current = next;
    schedule();
  }

  async function leave(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!(await flush())) {
      toast.error(
        "Vos dernières modifications n'ont pas pu être enregistrées. Réessayez avant de quitter.",
      );
      return;
    }
    router.push(props.backHref);
  }

  function close() {
    startClosing(async () => {
      if (plan.some((a) => !a.title.trim() && (a.description || a.dueDate || a.skillId))) {
        toast.error("Donnez un titre à chaque action, ou supprimez-la.");
        setArmed(false);
        return;
      }
      if (!(await flush())) {
        toast.error("Enregistrement impossible : vérifiez votre connexion avant de clôturer.");
        return;
      }
      const result = await closeCoaching({ coachingId: props.coachingId, slug: props.slug });
      if (!result.ok) {
        toast.error(result.message);
        setArmed(false);
        return;
      }
      toast.success("Compte rendu clôturé : le commercial est prévenu.");
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-bone/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-(--radius-control) sm:border lg:top-0">
        <p className="text-sm font-semibold">Compte rendu</p>
        <SaveIndicator state={saveState} />
      </div>

      <TextBlock
        id="report-context"
        label="Contexte"
        hint="Journée, clients rencontrés, conditions…"
        value={texts.context}
        onChange={(v) => setText("context", v)}
      />

      <section aria-labelledby="observations-title">
        <h2 id="observations-title" className="mb-1 text-lg font-semibold">
          Observations
        </h2>
        <p className="mb-3 text-sm text-muted">
          Note facultative : elle apparaît comme « observée en coaching » et ne remplace pas une
          évaluation.
        </p>
        <div className="flex flex-col gap-3">
          {props.targetSkills.map((skill) => {
            const o = observations[skill.id];
            const score = o?.score ?? null;
            return (
              <Card key={skill.id} className="p-4" data-skill={skill.name}>
                <p className="font-semibold" id={`obs-${skill.id}`}>
                  {skill.name}
                </p>
                <ScoreButtons
                  className="mt-3"
                  labelledBy={`obs-${skill.id}`}
                  value={score}
                  onChange={(value) => setObservation(skill.id, { score: value })}
                />
                {score !== null ? (
                  <p className="mt-2 text-sm text-forest-light">
                    <span className="font-semibold">
                      {score} · {fr.levels[score as 0 | 1 | 2 | 3 | 4]}
                    </span>
                    {skill.levels[score] ? ` — ${skill.levels[score]}` : null}
                  </p>
                ) : null}
                <Textarea
                  aria-label={`Ce que vous avez observé : ${skill.name}`}
                  className="mt-3"
                  placeholder="Ce que vous avez observé"
                  defaultValue={o?.comment ?? ""}
                  maxLength={1000}
                  onChange={(e) => setObservation(skill.id, { comment: e.target.value || null })}
                />
              </Card>
            );
          })}
        </div>
      </section>

      <TextBlock
        id="report-strengths"
        label="Points forts"
        value={texts.strengths}
        onChange={(v) => setText("strengths", v)}
      />
      <TextBlock
        id="report-improvements"
        label="Axes de progrès"
        value={texts.improvements}
        onChange={(v) => setText("improvements", v)}
      />

      <section aria-labelledby="plan-title">
        <h2 id="plan-title" className="mb-1 text-lg font-semibold">
          Plan d&apos;action
        </h2>
        <p className="mb-3 text-sm text-muted">
          À la clôture, ces actions rejoignent le plan de progrès du commercial.
        </p>
        <div className="flex flex-col gap-3">
          {plan.map((item, index) => (
            <Card key={index} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2">
                <Input
                  aria-label={`Action ${index + 1}`}
                  placeholder="Ex. : Reformuler le besoin avant chaque présentation"
                  value={item.title}
                  maxLength={200}
                  onChange={(e) =>
                    updatePlan(
                      plan.map((a, i) => (i === index ? { ...a, title: e.target.value } : a)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer l'action ${index + 1}`}
                  onClick={() => updatePlan(plan.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  aria-label={`Compétence liée à l'action ${index + 1}`}
                  value={item.skillId ?? ""}
                  onChange={(e) =>
                    updatePlan(
                      plan.map((a, i) =>
                        i === index ? { ...a, skillId: e.target.value || null } : a,
                      ),
                    )
                  }
                >
                  <option value="">Compétence (facultatif)</option>
                  {props.skillOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  aria-label={`Échéance de l'action ${index + 1}`}
                  value={item.dueDate ?? ""}
                  onChange={(e) =>
                    updatePlan(
                      plan.map((a, i) =>
                        i === index ? { ...a, dueDate: e.target.value || null } : a,
                      ),
                    )
                  }
                />
              </div>
            </Card>
          ))}
          {plan.length < 10 ? (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() =>
                updatePlan([
                  ...plan,
                  {
                    title: "",
                    description: null,
                    skillId: props.targetSkills[0]?.id ?? null,
                    dueDate: null,
                  },
                ])
              }
            >
              <Plus aria-hidden="true" /> Ajouter une action
            </Button>
          ) : null}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href={props.backHref}
            onClick={leave}
            className="shrink-0 text-sm font-semibold whitespace-nowrap text-forest-light hover:text-forest-deep"
          >
            Finir plus tard
          </Link>
          {armed ? (
            <Button onClick={close} disabled={closing} autoFocus>
              {closing ? "Clôture…" : "Confirmer la clôture"}
            </Button>
          ) : (
            <Button onClick={() => setArmed(true)} disabled={!props.canCloseNow}>
              Clôturer le compte rendu
            </Button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-right text-xs text-muted">
          {props.canCloseNow
            ? armed
              ? "Le commercial recevra le compte rendu par email. Il ne sera plus modifiable."
              : null
            : "La clôture sera possible une fois le coaching commencé."}
        </p>
      </div>
    </div>
  );
}

function TextBlock(props: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section>
      <label htmlFor={props.id} className="mb-1 block text-lg font-semibold">
        {props.label}
      </label>
      {props.hint ? <p className="mb-2 text-sm text-muted">{props.hint}</p> : null}
      <Textarea
        id={props.id}
        value={props.value}
        maxLength={4000}
        className="min-h-24"
        onChange={(e) => props.onChange(e.target.value)}
      />
    </section>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const base = "inline-flex items-center gap-1.5 text-sm";
  if (state.kind === "saving") {
    return (
      <span className={cn(base, "text-muted")} role="status">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Enregistrement…
      </span>
    );
  }
  if (state.kind === "saved") {
    const time = new Date(state.at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <span className={cn(base, "text-success")} role="status">
        <Check aria-hidden="true" className="size-4" /> Brouillon enregistré à {time}
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
