import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Connexion" };

// Page provisoire : la connexion par code email arrive à l'étape 1.
export default function LoginPlaceholderPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Card className="w-full text-center">
        <Logo kind="mark" className="mx-auto mb-4 h-10" />
        <CardTitle>Connexion bientôt disponible</CardTitle>
        <CardDescription className="mt-2">
          L&apos;accès à la plateforme est en cours de préparation. Vous recevrez une invitation par
          email dès l&apos;ouverture de votre espace.
        </CardDescription>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </Card>
    </div>
  );
}
