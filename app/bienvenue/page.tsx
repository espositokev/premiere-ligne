import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";

import { TermsForm } from "./terms-form";

export const metadata: Metadata = { title: "Bienvenue" };

/** Acceptation des CGU à la première connexion, pour les comptes créés hors invitation (§14). */
export default async function WelcomePage() {
  const user = await requireUser();
  if (user.termsAcceptedAt) redirect("/espaces");

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Card>
        <Logo kind="mark" className="mb-4 h-9" />
        <h1 className="text-2xl font-semibold">Bienvenue {user.firstName}</h1>
        <p className="mt-2 mb-6 text-muted">
          Avant de commencer, merci d&apos;accepter les conditions d&apos;utilisation de la
          plateforme.
        </p>
        <TermsForm />
      </Card>
    </div>
  );
}
