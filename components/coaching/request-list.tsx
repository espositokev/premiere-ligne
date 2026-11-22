import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

import { declineCoachingRequest, withdrawCoachingRequest } from "@/app/actions/coaching-requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/form-controls";
import type { CoachingRequestSummary } from "@/lib/data/coachings";

import { ReasonForm } from "./reason-form";

const STATUS: Record<
  CoachingRequestSummary["status"],
  { label: string; tone: "warning" | "success" | "muted" }
> = {
  en_attente: { label: "En attente", tone: "warning" },
  acceptee: { label: "Acceptée", tone: "success" },
  refusee: { label: "Refusée", tone: "muted" },
};

function since(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** Demandes reçues par le manager : planifier (formulaire prérempli) ou refuser avec un message. */
export function ManagerRequestList({
  slug,
  requests,
}: {
  slug: string;
  requests: CoachingRequestSummary[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {requests.map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.requesterName}</p>
                <p className="text-sm text-muted">Demandé le {since(r.createdAt)}</p>
              </div>
              <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
            </div>
            {r.skills.length ? (
              <p className="text-sm text-forest-light">{r.skills.map((s) => s.name).join(" · ")}</p>
            ) : null}
            {r.message ? (
              <p className="flex gap-2 rounded-(--radius-control) bg-bone px-3 py-2 text-sm whitespace-pre-line">
                <MessageCircleQuestion
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted"
                />
                {r.message}
              </p>
            ) : null}
            {r.answer && r.status === "refusee" ? (
              <p className="text-sm text-muted">Votre réponse : {r.answer}</p>
            ) : null}
            {r.status === "en_attente" ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link
                    href={`/e/${slug}/coachings/nouveau?commercial=${r.requesterMembershipId}&demande=${r.id}`}
                  >
                    Planifier le coaching
                  </Link>
                </Button>
                <ReasonForm
                  action={declineCoachingRequest}
                  hidden={{ slug, request_id: r.id }}
                  fieldName="answer"
                  openLabel="Refuser"
                  label="Votre message au commercial"
                  submitLabel="Envoyer le refus"
                  placeholder="Ex. : On en parle à l'entretien de vendredi"
                  variant="ghost"
                />
              </div>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** Demandes du commercial, avec la réponse du manager. */
export function MyRequestList({
  slug,
  requests,
}: {
  slug: string;
  requests: CoachingRequestSummary[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {requests.map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">Demande du {since(r.createdAt)}</p>
              <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
            </div>
            {r.skills.length ? (
              <p className="font-medium">{r.skills.map((s) => s.name).join(" · ")}</p>
            ) : null}
            {r.message ? (
              <p className="text-sm whitespace-pre-line text-forest-light">{r.message}</p>
            ) : null}
            {r.status === "refusee" && r.answer ? (
              <p className="rounded-(--radius-control) bg-bone px-3 py-2 text-sm">
                Réponse : {r.answer}
              </p>
            ) : null}
            {r.status === "en_attente" ? (
              <form action={withdrawCoachingRequest}>
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="slug" value={slug} />
                <ConfirmSubmitButton
                  label="Retirer ma demande"
                  confirmLabel="Confirmer"
                  variant="ghost"
                  size="sm"
                />
              </form>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
