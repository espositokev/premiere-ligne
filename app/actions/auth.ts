"use server";

import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) await audit({ action: "auth.logout", actorUserId: user.id });
  redirect("/connexion");
}
