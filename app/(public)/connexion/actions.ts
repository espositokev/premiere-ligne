"use server";

import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { getMySpaces } from "@/lib/auth/current-user";
import { homePathFor } from "@/lib/domain/navigation";
import { safeNextPath } from "@/lib/domain/redirects";
import { formError, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createSessionClient as createClient } from "@/lib/supabase/session";
import { fieldErrors, requestCodeSchema, verifyCodeSchema } from "@/lib/validation/schemas";

export type LoginState = FormState & { step?: "email" | "code"; email?: string };

/** Étape 1 : envoi d'un code à 6 chiffres par email (jamais de création de compte ici). */
export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = requestCodeSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ...formError("Vérifiez l'adresse email.", fieldErrors(parsed.error)), step: "email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  // Adresse inconnue : même réponse qu'une adresse connue, pour ne pas révéler qui a un compte.
  if (error && error.status === 429) {
    return {
      ...formError("Trop de demandes. Patientez une minute avant de redemander un code."),
      step: "email",
    };
  }
  if (error && error.code !== "otp_disabled" && error.status !== 422 && error.status !== 400) {
    console.error("[connexion] envoi du code", error.message);
    return { ...formError(UNEXPECTED_ERROR), step: "email" };
  }

  return { status: "success", step: "code", email: parsed.data.email, nonce: Date.now() };
}

/** Étape 2 : vérification du code, puis arrivée dans le bon espace. */
export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = verifyCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return {
      ...formError("Le code contient 6 chiffres.", fieldErrors(parsed.error)),
      step: "code",
      email,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error || !data.user) {
    return {
      ...formError(
        "Code incorrect ou expiré. Vérifiez le dernier email reçu ou demandez un nouveau code.",
      ),
      step: "code",
      email,
    };
  }

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.user.id);
  await audit({ action: "auth.login", actorUserId: data.user.id });

  const next = safeNextPath(formData.get("suivant"));
  if (next) redirect(next);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", data.user.id)
    .maybeSingle();
  const spaces = await getMySpaces();
  redirect(homePathFor({ isSuperAdmin: profile?.is_super_admin ?? false, spaces }));
}
