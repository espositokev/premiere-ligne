#!/usr/bin/env node
/**
 * Visite guidée : photographie chaque écran avec les données de démonstration, sur téléphone et
 * sur ordinateur. Lancé en CI (workflow « Visite guidée ») après `scripts/seed-demo.mjs`.
 *
 * Sortie : captures/<numéro>-<nom>-<appareil>.jpg et captures/index.json (titres, descriptions).
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const MAILPIT = (process.env.MAILPIT_URL ?? "http://127.0.0.1:54324").replace(/\/$/, "");
const OUT = "captures";
mkdirSync(OUT, { recursive: true });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

async function one(query, label) {
  const { data, error } = await query;
  if (error || !data) throw new Error(`${label} : ${error?.message ?? "introuvable"}`);
  return data;
}

const org = await one(
  db.from("organizations").select("id").eq("slug", "concession-demo").single(),
  "entreprise",
);
const memberOf = async (email) => {
  const profile = await one(db.from("profiles").select("id").eq("email", email).single(), email);
  return (
    await one(
      db
        .from("memberships")
        .select("id")
        .eq("user_id", profile.id)
        .eq("organization_id", org.id)
        .single(),
      email,
    )
  ).id;
};
const leo = await memberOf("leo.bernard@demo.local");
const ines = await memberOf("ines.robert@demo.local");
const tom = await memberOf("tom.martin@demo.local");
const toWrite = await one(
  db
    .from("coachings")
    .select("id")
    .eq("subject_membership_id", tom)
    .eq("status", "planifie")
    .limit(1)
    .single(),
  "coaching à rédiger",
);
const closed = await one(
  db
    .from("coachings")
    .select("id")
    .eq("subject_membership_id", leo)
    .eq("status", "cloture")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .single(),
  "coaching clôturé",
);
const draft = await one(
  db
    .from("evaluations")
    .select("id")
    .eq("subject_membership_id", ines)
    .eq("status", "brouillon")
    .limit(1)
    .single(),
  "brouillon",
);
const dojo = await one(
  db.from("dojo_sessions").select("dojo_id").eq("organization_id", org.id).limit(1).single(),
  "dojo",
);
const e = "/e/concession-demo";

const personas = [
  {
    email: "admin@demo.local",
    who: "Toi (super admin)",
    pages: [
      [
        "admin",
        "/admin",
        "Ton tableau de bord",
        "Toutes les entreprises clientes et leur activité du mois.",
      ],
      [
        "admin-entreprise",
        `/admin/entreprises/${org.id}`,
        "Une entreprise cliente",
        "Sa matrice, ses utilisateurs, son statut, l'export et la suppression RGPD.",
      ],
      [
        "admin-modeles",
        "/admin/modeles",
        "Les modèles de matrice",
        "Tes deux modèles, copiés chez chaque nouveau client.",
      ],
      [
        "admin-journal",
        "/admin/journal",
        "Le journal d'activité",
        "Qui a fait quoi, dans toutes les entreprises.",
      ],
    ],
  },
  {
    email: "claire.martin@demo.local",
    who: "Claire, responsable de la concession",
    pages: [
      [
        "responsable-accueil",
        e,
        "Tableau de bord du responsable",
        "Indicateurs de toute la concession, par équipe, coachings par manager.",
      ],
      [
        "responsable-commerciaux",
        `${e}/equipe`,
        "Les commerciaux",
        "Tous les commerciaux, regroupés par équipe.",
      ],
      [
        "responsable-parametres",
        `${e}/parametres`,
        "Paramètres",
        "Utilisateurs, équipes, matrice, fonctionnement, journal.",
      ],
      [
        "responsable-fonctionnement",
        `${e}/parametres/entreprise`,
        "Fonctionnement de l'entreprise",
        "Auto-évaluation, demandes de coaching, alerte « sans coaching ».",
      ],
      [
        "responsable-matrice",
        `${e}/parametres/referentiel`,
        "La matrice de la concession",
        "Adaptable sur le terrain : ajouter, renommer, désactiver.",
      ],
      [
        "responsable-utilisateur",
        `${e}/parametres/utilisateurs/${leo}`,
        "Fiche utilisateur",
        "Rôle, équipe, « voir en tant que », export RGPD, désactivation.",
      ],
    ],
  },
  {
    email: "julien.petit@demo.local",
    who: "Julien, manager de l'équipe Nord",
    pages: [
      [
        "manager-accueil",
        e,
        "Tableau de bord du manager",
        "Comptes rendus à rédiger, commerciaux à suivre, radar et points faibles de l'équipe.",
      ],
      ["manager-coachings", `${e}/coachings`, "Les coachings", "À rédiger, demandes, à venir."],
      [
        "manager-semaine",
        `${e}/coachings?vue=semaine`,
        "La semaine",
        "Les coachings jour par jour.",
      ],
      [
        "manager-planifier",
        `${e}/coachings/nouveau?commercial=${leo}`,
        "Planifier un coaching",
        "Date, format, lieu, objectif, 1 à 3 compétences.",
      ],
      [
        "manager-compte-rendu",
        `${e}/coachings/${toWrite.id}`,
        "Rédiger un compte rendu",
        "Enregistré automatiquement, clôture en deux temps.",
      ],
      [
        "manager-cr-cloture",
        `${e}/coachings/${closed.id}`,
        "Un compte rendu clôturé",
        "Observations, points forts, axes de progrès, commentaire du commercial.",
      ],
      [
        "manager-fiche",
        `${e}/equipe/${leo}`,
        "Fiche d'un commercial",
        "Maîtrise, radar, matrice avec évolution.",
      ],
      [
        "manager-fiche-plan",
        `${e}/equipe/${leo}?vue=plan`,
        "Son plan de progrès",
        "Les actions, en retard en tête.",
      ],
      [
        "manager-evaluation",
        `${e}/equipe/${ines}/evaluations/${draft.id}`,
        "Évaluer un commercial",
        "Notes de 0 à 4 en gros boutons, au pouce.",
      ],
      [
        "manager-actions",
        `${e}/equipe/actions`,
        "Actions de l'équipe",
        "Filtrables par commercial, compétence, retard.",
      ],
      ["manager-dojos", `${e}/dojos`, "Les Dojos", "Ta bibliothèque, rangée par compétence."],
      [
        "manager-dojo",
        `${e}/dojos/${dojo.dojo_id}`,
        "Un Dojo",
        "Théorie, pratique, mise en situation, et les séances notées.",
      ],
    ],
  },
  {
    email: "leo.bernard@demo.local",
    who: "Léo, commercial",
    pages: [
      [
        "commercial-progression",
        `${e}/moi`,
        "Ma progression",
        "« À faire pour toi », radar, matrice avec les niveaux.",
      ],
      ["commercial-plan", `${e}/moi/plan`, "Mon plan", "Ses actions, un tap pour avancer."],
      [
        "commercial-coachings",
        `${e}/coachings`,
        "Mes coachings",
        "À venir, demandes, comptes rendus, séances de Dojo.",
      ],
      [
        "commercial-cr",
        `${e}/coachings/${closed.id}`,
        "Un compte rendu reçu",
        "Il le lit et ajoute son commentaire.",
      ],
      [
        "commercial-demande",
        `${e}/coachings/demander`,
        "Demander un coaching",
        "Il choisit ce qu'il veut travailler.",
      ],
    ],
  },
];

async function loginCode(email) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const body = await search.json();
    const first = body.messages?.[0];
    if (first) {
      const detail = await (await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)).json();
      const match = `${detail.Text ?? ""} ${detail.HTML ?? ""}`.match(/\b(\d{6})\b/);
      if (match) {
        await fetch(`${MAILPIT}/api/v1/messages`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ IDs: [first.ID] }),
        });
        return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Pas de code pour ${email}`);
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {},
);
const index = [];
let n = 0;
for (const persona of personas) {
  const contexts = {
    mobile: await browser.newContext({
      ...devices["iPhone 13"],
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
    }),
    ordinateur: await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
    }),
  };
  for (const [device, context] of Object.entries(contexts)) {
    const page = await context.newPage();
    await page.goto(`${BASE}/connexion`);
    await page.getByLabel("Adresse email professionnelle").fill(persona.email);
    await page.getByRole("button", { name: "Recevoir mon code" }).click();
    await page.getByLabel("Code reçu par email").waitFor();
    await page.getByLabel("Code reçu par email").fill(await loginCode(persona.email));
    await page.getByRole("button", { name: "Me connecter" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/connexion"), { timeout: 20_000 });
    for (const [slug, path] of persona.pages) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const file = `${String(n + persona.pages.findIndex((p) => p[0] === slug)).padStart(2, "0")}-${slug}-${device}.jpg`;
      await page.screenshot({ path: `${OUT}/${file}`, fullPage: true, type: "jpeg", quality: 72 });
      console.log("📸", file);
    }
    await context.close();
  }
  for (const [i, [slug, path, title, text]] of persona.pages.entries()) {
    const num = String(n + i).padStart(2, "0");
    index.push({
      who: persona.who,
      title,
      text,
      path,
      mobile: `${num}-${slug}-mobile.jpg`,
      desktop: `${num}-${slug}-ordinateur.jpg`,
    });
  }
  n += persona.pages.length;
}
await browser.close();
writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));
console.log(`✓ ${index.length} écrans photographiés`);
