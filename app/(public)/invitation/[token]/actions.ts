"use server";

import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { hashToken } from "@/lib/auth/tokens";
import { invitationState } from "@/lib/domain/invitations";
import { formError, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { acceptInvitationSchema, fieldErrors } from "@/lib/validation/schemas";

/**
 * Acceptation d'une invitation (§3.2).
 * La personne n'a pas encore de compte : tout se fait avec la clé serveur, après avoir
 * vérifié le jeton (empreinte, expiration, annulation, entreprise active).
 */
export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get("token"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    accept_terms: formData.get("accept_terms"),
  });
  if (!parsed.success) {
    return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));
  }
  const input = parsed.data;
  const service = createServiceClient();

  const { data: invitation } = await service
    .from("invitations")
    .select(
      "id, organization_id, email, role, team_id, job_title, expires_at, accepted_at, revoked_at, organizations!inner(slug, status)",
    )
    .eq("token_hash", hashToken(input.token))
    .maybeSingle();

  if (
    !invitation ||
    invitationState(invitation) !== "en_attente" ||
    invitation.organizations.status !== "actif"
  ) {
    return formError(
      "Cette invitation n'est plus valable. Demandez-en une nouvelle à votre responsable.",
    );
  }

  const now = new Date().toISOString();

  try {
    // 1. Compte : réutilise le compte existant (même personne invitée ailleurs) ou en crée un.
    const { data: existing } = await service
      .from("profiles")
      .select("id, terms_accepted_at")
      .eq("email", invitation.email)
      .maybeSingle();

    let userId = existing?.id;
    if (!userId) {
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email: invitation.email,
        email_confirm: true,
      });
      if (createError || !created.user) throw createError ?? new Error("création du compte");
      userId = created.user.id;
      const { error: profileError } = await service.from("profiles").insert({
        id: userId,
        email: invitation.email,
        first_name: input.first_name,
        last_name: input.last_name,
        terms_accepted_at: now,
      });
      if (profileError) throw profileError;
    } else {
      const { error: profileError } = await service
        .from("profiles")
        .update({
          first_name: input.first_name,
          last_name: input.last_name,
          terms_accepted_at: existing?.terms_accepted_at ?? now,
        })
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    // 2. Appartenance : créée, ou réactivée si la personne avait déjà fait partie de l'entreprise.
    const membership = {
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      team_id: invitation.role === "sales_rep" ? invitation.team_id : null,
      job_title: invitation.job_title,
      active: true,
    };
    const { error: membershipError } = await service
      .from("memberships")
      .upsert(membership, { onConflict: "organization_id,user_id" });
    if (membershipError) throw membershipError;

    // 3. L'invitation est consommée : le lien ne fonctionne plus.
    const { error: acceptError } = await service
      .from("invitations")
      .update({ accepted_at: now })
      .eq("id", invitation.id)
      .is("accepted_at", null);
    if (acceptError) throw acceptError;

    await audit({
      action: "invitation.accepted",
      actorUserId: userId,
      organizationId: invitation.organization_id,
      targetType: "invitation",
      targetId: invitation.id,
    });

    // 4. Connexion immédiate, sans attendre un code : un lien magique généré côté serveur
    //    est vérifié tout de suite, ce qui pose les cookies de session.
    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: invitation.email,
    });
    if (linkError || !link.properties?.hashed_token)
      throw linkError ?? new Error("lien de connexion");
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (verifyError) throw verifyError;
  } catch (error) {
    console.error("[invitation] acceptation", error);
    return formError(UNEXPECTED_ERROR);
  }

  const slug = invitation.organizations.slug;
  redirect(invitation.role === "sales_rep" ? `/e/${slug}/moi` : `/e/${slug}`);
}
