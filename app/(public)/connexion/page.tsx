import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/domain/redirects";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const next = safeNextPath(params.suivant);

  // Déjà connecté : on file directement vers son espace.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && (await getCurrentUser())) {
    redirect(next ?? "/espaces");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <Card className="w-full">
        <Logo kind="mark" className="mb-4 h-9" />
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-1 mb-6 text-muted">Accédez à votre espace Première Ligne.</p>
        <LoginForm next={next} />
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ? L&apos;accès se fait sur invitation de votre responsable.
      </p>
    </div>
  );
}
