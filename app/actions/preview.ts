"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import {
  encodePreview,
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE,
  previewAvailable,
} from "@/lib/auth/preview";
import { createSessionClient } from "@/lib/supabase/session";
import { uuidSchema } from "@/lib/validation/schemas";

const schema = z.object({ slug: z.string().min(1), member_id: uuidSchema });

/**
 * Démarrer un « voir en tant que » (§4.11) : réservé au super admin et au responsable de
 * l'entreprise, vérifié ici avec la vraie session, puis à chaque requête. Journalisé.
 */
export async function startPreview(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    member_id: formData.get("member_id"),
  });
  if (!parsed.success || !previewAvailable()) redirect("/espaces");
  const { slug, member_id } = parsed.data;

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: member } = await supabase
    .from("memberships")
    .select(
      "organization_id, user_id, role, profiles!inner(is_super_admin, first_name, last_name), organizations!inner(slug)",
    )
    .eq("id", member_id)
    .maybeSingle();
  if (
    !member ||
    member.organizations.slug !== slug ||
    member.user_id === user.id ||
    member.profiles.is_super_admin
  ) {
    redirect(`/e/${slug}`);
  }
  const [{ data: me }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("is_super_admin").eq("id", user.id).single(),
    supabase.rpc("is_org_admin", { org: member.organization_id }),
  ]);
  if (!me?.is_super_admin && isAdmin !== true) redirect(`/e/${slug}`);

  const cookieStore = await cookies();
  cookieStore.set(
    PREVIEW_COOKIE,
    encodePreview({ actor: user.id, target: member.user_id, org: member.organization_id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PREVIEW_MAX_AGE,
    },
  );
  await audit({
    action: "preview.started",
    actorUserId: user.id,
    organizationId: member.organization_id,
    targetType: "membership",
    targetId: member_id,
    details: {
      role: member.role,
      name: `${member.profiles.first_name} ${member.profiles.last_name}`,
    },
  });
  redirect(member.role === "sales_rep" ? `/e/${slug}/moi` : `/e/${slug}`);
}
