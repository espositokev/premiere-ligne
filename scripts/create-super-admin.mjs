#!/usr/bin/env node
/**
 * Crée (ou promeut) le compte super admin de Première Ligne (§15.7).
 *
 * Usage :
 *   pnpm create-super-admin prenom.nom@exemple.fr "Prénom" "Nom"
 *
 * Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
 * Aucun mot de passe : la connexion se fait par code envoyé par email.
 */
import { createClient } from "@supabase/supabase-js";

const [email, firstName = "Super", lastName = "Admin"] = process.argv.slice(2);

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage : pnpm create-super-admin email@exemple.fr "Prénom" "Nom"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (.env.local).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const normalized = email.trim().toLowerCase();

const { data: existing, error: readError } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", normalized)
  .maybeSingle();
if (readError) {
  console.error("Lecture impossible :", readError.message);
  process.exit(1);
}

let userId = existing?.id;
if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("Création du compte impossible :", error?.message);
    process.exit(1);
  }
  userId = data.user.id;
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: normalized,
    first_name: firstName,
    last_name: lastName,
    is_super_admin: true,
  });
  if (profileError) {
    console.error("Création du profil impossible :", profileError.message);
    process.exit(1);
  }
} else {
  const { error } = await supabase
    .from("profiles")
    .update({ is_super_admin: true })
    .eq("id", userId);
  if (error) {
    console.error("Mise à jour impossible :", error.message);
    process.exit(1);
  }
}

await supabase.from("audit_log").insert({
  action: "super_admin.granted",
  actor_user_id: null,
  target_type: "profile",
  target_id: userId,
});

console.log(
  `✓ ${normalized} est super admin. Connexion sur /connexion avec un code reçu par email.`,
);
