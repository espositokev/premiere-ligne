"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { PREVIEW_COOKIE } from "@/lib/auth/preview";
import { createSessionClient } from "@/lib/supabase/session";

/** Déconnexion de la vraie session (et fin d'un éventuel « voir en tant que »). */
export async function signOut() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  (await cookies()).delete(PREVIEW_COOKIE);
  if (user) await audit({ action: "auth.logout", actorUserId: user.id });
  redirect("/connexion");
}
