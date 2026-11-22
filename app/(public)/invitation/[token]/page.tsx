import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hashToken } from "@/lib/auth/tokens";
import { invitationState } from "@/lib/domain/invitations";
import { ROLE_LABELS } from "@/lib/domain/roles";
import { createServiceClient } from "@/lib/supabase/service";

import { AcceptForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Invitation",
  // Le lien est personnel : il ne doit jamais être indexé.
  robots: { index: false, follow: false },
};

export default async function InvitationPage({ params }: PageProps<"/invitation/[token]">) {
  const { token } = await params;

  const valid = typeof token === "string" && token.length >= 20 && token.length <= 200;
  const invitation = valid
    ? (
        await createServiceClient()
          .from("invitations")
          .select(
            "first_name, last_name, email, role, expires_at, accepted_at, revoked_at, organizations!inner(name, status), teams(name)",
          )
          .eq("token_hash", hashToken(token))
          .maybeSingle()
      ).data
    : null;

  const state = invitation ? invitationState(invitation) : null;
  const usable =
    invitation && state === "en_attente" && invitation.organizations.status === "actif";

  if (!usable) {
    const message =
      state === "acceptee"
        ? "Cette invitation a déjà été utilisée. Connectez-vous avec votre adresse email."
        : state === "expiree"
          ? "Cette invitation a expiré. Demandez à votre responsable de vous la renvoyer."
          : "Ce lien d'invitation n'est pas valable. Demandez une nouvelle invitation à votre responsable.";
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <Card className="text-center">
          <CircleAlert aria-hidden="true" className="mx-auto mb-3 size-10 text-warning" />
          <h1 className="text-2xl font-bold">Invitation indisponible</h1>
          <p className="mt-2 text-muted">{message}</p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/connexion">Aller à la connexion</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Card>
        <Logo kind="mark" className="mb-4 h-9" />
        <h1 className="text-2xl font-bold">Bienvenue {invitation.first_name} !</h1>
        <p className="mt-2 text-muted">
          Vous êtes invité à rejoindre l&apos;espace{" "}
          <strong className="text-forest-deep">{invitation.organizations.name}</strong> en tant que{" "}
          {ROLE_LABELS[invitation.role].toLowerCase()}
          {invitation.teams?.name ? ` (${invitation.teams.name})` : ""}.
        </p>
        <p className="mt-1 mb-6 text-sm text-muted">Compte : {invitation.email}</p>
        <AcceptForm
          token={token}
          firstName={invitation.first_name}
          lastName={invitation.last_name}
        />
      </Card>
    </div>
  );
}
