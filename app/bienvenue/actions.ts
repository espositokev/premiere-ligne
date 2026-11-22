"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { formError, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export async function acceptTerms(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (formData.get("accept_terms") !== "on") {
    return formError("Vous devez accepter les conditions pour continuer.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("terms_accepted_at", null);
  if (error) {
    console.error("[bienvenue] acceptation", error.message);
    return formError(UNEXPECTED_ERROR);
  }
  redirect(user.isSuperAdmin ? "/admin" : "/espaces");
}
