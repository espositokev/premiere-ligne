import type { Metadata } from "next";

import { PersonalShell } from "@/components/layout/personal-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth/current-user";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <PersonalShell>
      <PageHeader title="Mon profil" description={user.email} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <ProfileForm firstName={user.firstName} lastName={user.lastName} phone={user.phone} />
        </Card>
        <Card>
          <CardTitle>Connexion</CardTitle>
          <CardDescription className="mt-2 text-sm">
            Pas de mot de passe : à chaque connexion, un code à usage unique est envoyé à{" "}
            <strong className="break-all text-forest-deep">{user.email}</strong>. Pour changer
            d&apos;adresse, demandez à votre responsable.
          </CardDescription>
        </Card>
      </div>
    </PersonalShell>
  );
}
