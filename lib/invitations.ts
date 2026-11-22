import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { generateInvitationToken } from "@/lib/auth/tokens";
import type { CurrentUser } from "@/lib/auth/current-user";
import { invitationExpiry } from "@/lib/domain/invitations";
import { invitationEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import type { Database, OrgRole } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type InvitationInput = {
  email: string;
  first_name: string;
  last_name: string;
  role: OrgRole;
  team_id: string | null;
  job_title: string | null;
};

export type InvitationOutcome =
  { ok: true; emailSent: boolean } | { ok: false; error: string; field?: string };

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function deliver(input: {
  token: string;
  email: string;
  firstName: string;
  role: OrgRole;
  organizationId: string;
  organizationName: string;
  inviter: CurrentUser;
}): Promise<boolean> {
  const message = invitationEmail({
    firstName: input.firstName,
    organizationName: input.organizationName,
    role: input.role,
    inviterName: `${input.inviter.firstName} ${input.inviter.lastName}`,
    link: `${appUrl()}/invitation/${input.token}`,
  });
  const result = await sendEmail({
    to: input.email,
    ...message,
    template: "invitation",
    organizationId: input.organizationId,
  });
  return result.ok;
}

/**
 * Crée une invitation et envoie l'email.
 * L'écriture passe par le client de l'utilisateur : c'est la RLS qui décide s'il a le droit
 * d'inviter ce rôle dans cette équipe (§2.2, §8.3).
 */
export async function createInvitation(
  supabase: Client,
  actor: CurrentUser,
  organization: { id: string; name: string },
  input: InvitationInput,
): Promise<InvitationOutcome> {
  // Déjà membre actif ?
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("memberships")
      .select("id, active")
      .eq("organization_id", organization.id)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (existingMember?.active) {
      return {
        ok: false,
        error: "Cette personne fait déjà partie de l'entreprise.",
        field: "email",
      };
    }
  }

  const { token, hash } = generateInvitationToken();
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: organization.id,
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      role: input.role,
      team_id: input.team_id,
      job_title: input.job_title,
      token_hash: hash,
      expires_at: invitationExpiry().toISOString(),
      invited_by: actor.id,
      last_sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !invitation) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Une invitation est déjà en attente pour cette adresse. Vous pouvez la renvoyer.",
        field: "email",
      };
    }
    if (error?.code === "42501") {
      return { ok: false, error: "Vous n'avez pas le droit d'inviter cette personne à ce rôle." };
    }
    console.error("[invitation] création", error?.message);
    return { ok: false, error: "L'invitation n'a pas pu être créée." };
  }

  await audit({
    action: "invitation.created",
    actorUserId: actor.id,
    organizationId: organization.id,
    targetType: "invitation",
    targetId: invitation.id,
    details: { role: input.role },
  });

  const emailSent = await deliver({
    token,
    email: input.email,
    firstName: input.first_name,
    role: input.role,
    organizationId: organization.id,
    organizationName: organization.name,
    inviter: actor,
  });
  return { ok: true, emailSent };
}

/** Renvoie une invitation : nouveau jeton (l'ancien lien ne marche plus), 7 jours de plus. */
export async function resendInvitation(
  supabase: Client,
  actor: CurrentUser,
  organization: { id: string; name: string },
  invitationId: string,
): Promise<InvitationOutcome> {
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, email, first_name, role, accepted_at, revoked_at")
    .eq("id", invitationId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invitation || invitation.accepted_at || invitation.revoked_at) {
    return { ok: false, error: "Cette invitation n'est plus en attente." };
  }

  const { token, hash } = generateInvitationToken();
  const { error } = await supabase
    .from("invitations")
    .update({
      token_hash: hash,
      expires_at: invitationExpiry().toISOString(),
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);
  if (error) {
    console.error("[invitation] renvoi", error.message);
    return { ok: false, error: "L'invitation n'a pas pu être renvoyée." };
  }

  await audit({
    action: "invitation.resent",
    actorUserId: actor.id,
    organizationId: organization.id,
    targetType: "invitation",
    targetId: invitation.id,
  });

  const emailSent = await deliver({
    token,
    email: invitation.email,
    firstName: invitation.first_name,
    role: invitation.role,
    organizationId: organization.id,
    organizationName: organization.name,
    inviter: actor,
  });
  return { ok: true, emailSent };
}

export async function revokeInvitation(
  supabase: Client,
  actor: CurrentUser,
  organizationId: string,
  invitationId: string,
): Promise<InvitationOutcome> {
  const { data, error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, error: "Cette invitation ne peut plus être annulée." };
  }
  await audit({
    action: "invitation.revoked",
    actorUserId: actor.id,
    organizationId,
    targetType: "invitation",
    targetId: invitationId,
  });
  return { ok: true, emailSent: false };
}
