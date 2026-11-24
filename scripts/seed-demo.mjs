#!/usr/bin/env node
/**
 * Données de démonstration (SPEC §17) — fictives uniquement, JAMAIS en production.
 *
 * Usage (base locale ou de test) :
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * Crée :
 * - le super admin admin@demo.local ;
 * - « Concession Démo » (matrice automobile) : 1 responsable, 2 équipes et leurs managers,
 *   8 commerciaux, 3 mois d'évaluations avec une progression visible, des coachings dans tous
 *   les statuts, des demandes, des actions (certaines en retard), des séances de Dojo ;
 * - « Démo Services B2B » (socle général) : 1 manager et 3 commerciaux, pour vérifier l'isolation.
 * Les dates sont calculées à partir d'aujourd'hui. Relancer le script recrée tout à neuf.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.");
  process.exit(1);
}
if (/supabase\.co/.test(url) && process.env.ALLOW_DEMO_SEED !== "1") {
  console.error(
    "Base distante détectée : refus par sécurité (ALLOW_DEMO_SEED=1 pour forcer une base de test).",
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (d, hour = 9) => {
  const date = new Date(now - d * DAY);
  date.setUTCHours(hour - 1, 0, 0, 0); // heure de Paris (hiver)
  return date.toISOString();
};
const dateOnly = (offsetDays) => new Date(now + offsetDays * DAY).toISOString().slice(0, 10);

// Hasard reproductible.
let seed = 42;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (v) => Math.max(0, Math.min(4, Math.round(v)));

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) {
    console.error(`✗ ${label} :`, error.message);
    process.exit(1);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Remise à zéro des données de démonstration
// ---------------------------------------------------------------------------

const DEMO_SLUGS = ["concession-demo", "demo-services-b2b"];
async function reset() {
  const { data: orgs } = await db.from("organizations").select("id").in("slug", DEMO_SLUGS);
  for (const org of orgs ?? []) {
    await db.from("organizations").update({ status: "archive" }).eq("id", org.id);
    await db
      .from("organizations")
      .update({ archived_at: new Date(now - 40 * DAY).toISOString() })
      .eq("id", org.id);
    const { error } = await db.rpc("purge_organization", { org: org.id });
    if (error) console.warn("purge :", error.message);
  }
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const user of list?.users ?? []) {
    if (user.email?.endsWith("@demo.local")) {
      await db.from("audit_log").delete().eq("actor_user_id", user.id);
      await db.from("profiles").delete().eq("id", user.id);
      await db.auth.admin.deleteUser(user.id);
    }
  }
}

async function user(email, firstName, lastName, superAdmin = false) {
  const created = await must(
    db.auth.admin.createUser({ email, email_confirm: true }),
    `compte ${email}`,
  );
  await must(
    db.from("profiles").insert({
      id: created.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      is_super_admin: superAdmin,
      terms_accepted_at: new Date(now - 90 * DAY).toISOString(),
      last_seen_at: new Date(now - Math.floor(rand() * 20) * DAY).toISOString(),
    }),
    `profil ${email}`,
  );
  return created.user.id;
}

async function organization(name, slug, templateName) {
  const org = await must(
    db.from("organizations").insert({ name, slug }).select("id").single(),
    name,
  );
  const template = await must(
    db.from("framework_templates").select("id").eq("name", templateName).single(),
    templateName,
  );
  await must(
    db.rpc("copy_template_to_organization", { template: template.id, org: org.id }),
    "matrice",
  );
  const framework = await must(
    db.from("frameworks").select("id").eq("organization_id", org.id).single(),
    "matrice",
  );
  const skills = await must(
    db
      .from("skills")
      .select("id, name, position, competencies!inner(position, blocks!inner(position))")
      .eq("organization_id", org.id),
    "compétences",
  );
  skills.sort(
    (a, b) =>
      a.competencies.blocks.position - b.competencies.blocks.position ||
      a.competencies.position - b.competencies.position ||
      a.position - b.position,
  );
  return { id: org.id, slug, frameworkId: framework.id, skills };
}

async function member(orgId, userId, role, extra = {}) {
  return (
    await must(
      db
        .from("memberships")
        .insert({
          organization_id: orgId,
          user_id: userId,
          role,
          hired_at: dateOnly(-400 - Math.floor(rand() * 900)),
          ...extra,
        })
        .select("id")
        .single(),
      `appartenance ${role}`,
    )
  ).id;
}

async function evaluation(
  org,
  subject,
  author,
  authorMember,
  validatedDaysAgo,
  scores,
  kind = "manager",
  comment = null,
) {
  const status = validatedDaysAgo === null ? "brouillon" : "validee";
  const ev = await must(
    db
      .from("evaluations")
      .insert({
        organization_id: org.id,
        subject_membership_id: subject,
        author_user_id: author,
        author_membership_id: authorMember,
        framework_id: org.frameworkId,
        kind,
        status,
        general_comment: comment,
        validated_at: status === "validee" ? daysAgo(validatedDaysAgo, 17) : null,
        created_at: daysAgo((validatedDaysAgo ?? 1) + 1),
      })
      .select("id")
      .single(),
    "évaluation",
  );
  const rows = Object.entries(scores).map(([skillId, score]) => ({
    evaluation_id: ev.id,
    skill_id: skillId,
    organization_id: org.id,
    score,
  }));
  if (rows.length) await must(db.from("evaluation_scores").insert(rows), "notes");
  return ev.id;
}

async function coaching(org, input) {
  const c = await must(
    db
      .from("coachings")
      .insert({
        organization_id: org.id,
        subject_membership_id: input.subject,
        coach_user_id: input.coach,
        coach_membership_id: input.coachMember,
        scheduled_at: input.at,
        duration_minutes: input.duration ?? 120,
        mode: input.mode ?? "terrain",
        location: input.location ?? "Showroom",
        objective: input.objective,
        status: input.status,
        cancel_reason: input.cancelReason ?? null,
        closed_at:
          input.status === "cloture"
            ? new Date(
                Date.parse(input.at) + (input.closeAfterHours ?? 26) * 3_600_000,
              ).toISOString()
            : null,
        rep_comment: input.repComment ?? null,
        request_id: input.requestId ?? null,
        reminder_sent_at: null,
      })
      .select("id")
      .single(),
    "coaching",
  );
  await must(
    db
      .from("coaching_skills")
      .insert(
        input.skills.map((s) => ({ coaching_id: c.id, skill_id: s, organization_id: org.id })),
      ),
    "compétences ciblées",
  );
  if (input.report) {
    await must(
      db
        .from("coaching_reports")
        .insert({ coaching_id: c.id, organization_id: org.id, ...input.report }),
      "compte rendu",
    );
    await must(
      db.from("coaching_observations").insert(
        input.skills.map((s, i) => ({
          coaching_id: c.id,
          skill_id: s,
          organization_id: org.id,
          score: input.observed?.[i] ?? null,
          comment: input.observedComments?.[i] ?? null,
        })),
      ),
      "observations",
    );
  }
  return c.id;
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

await reset();
console.log("→ données de démonstration remises à zéro");

await user("admin@demo.local", "Kevin", "Esposito", true);

const org = await organization("Concession Démo", "concession-demo", "Vente automobile");
const claireId = await user("claire.martin@demo.local", "Claire", "Martin");
const julienId = await user("julien.petit@demo.local", "Julien", "Petit");
const sarahId = await user("sarah.leroy@demo.local", "Sarah", "Leroy");
await member(org.id, claireId, "org_admin", { job_title: "Directrice des ventes" });
const julien = await member(org.id, julienId, "manager", { job_title: "Chef des ventes VO" });
const sarah = await member(org.id, sarahId, "manager", { job_title: "Chef des ventes VN" });

const nord = (
  await must(
    db.from("teams").insert({ organization_id: org.id, name: "Équipe Nord" }).select("id").single(),
    "équipe",
  )
).id;
const sud = (
  await must(
    db.from("teams").insert({ organization_id: org.id, name: "Équipe Sud" }).select("id").single(),
    "équipe",
  )
).id;
await must(
  db.from("team_managers").insert([
    { team_id: nord, membership_id: julien, organization_id: org.id },
    { team_id: sud, membership_id: sarah, organization_id: org.id },
  ]),
  "managers d'équipe",
);

const repsSpec = [
  ["leo.bernard", "Léo", "Bernard", nord, 1.7, "Conseiller commercial VO"],
  ["ines.robert", "Inès", "Robert", nord, 2.2, "Conseillère commerciale VO"],
  ["tom.martin", "Tom", "Martin", nord, 1.1, "Conseiller commercial junior"],
  ["chloe.dubois", "Chloé", "Dubois", nord, 2.6, "Conseillère commerciale senior"],
  ["yanis.moreau", "Yanis", "Moreau", sud, 1.6, "Conseiller commercial VN"],
  ["emma.laurent", "Emma", "Laurent", sud, 2.1, "Conseillère commerciale VN"],
  ["hugo.simon", "Hugo", "Simon", sud, 1.3, "Conseiller commercial VN"],
  ["manon.michel", "Manon", "Michel", sud, 1.9, "Conseillère commerciale VN"],
];
const reps = [];
for (const [login, first, last, team, level, title] of repsSpec) {
  const userId = await user(`${login}@demo.local`, first, last);
  const id = await member(org.id, userId, "sales_rep", { team_id: team, job_title: title });
  reps.push({
    id,
    userId,
    first,
    last,
    team,
    level,
    coach: team === nord ? julienId : sarahId,
    coachMember: team === nord ? julien : sarah,
  });
}
console.log("→ Concession Démo : 11 personnes");

// Pack IA actif, avec un peu d'usage ce mois-ci.
await must(db.from("organizations").update({ ai_plan: "pack_ia" }).eq("id", org.id), "option IA");
await must(
  db.from("ai_usage").insert([
    ...Array.from({ length: 4 }, () => ({
      organization_id: org.id,
      kind: "dojo",
      user_id: julienId,
    })),
    ...Array.from({ length: 7 }, () => ({
      organization_id: org.id,
      kind: "analyse_appel",
      user_id: sarahId,
    })),
  ]),
  "usage IA",
);

// Évaluations sur 3 mois, avec progression (et quelques reculs).
const skillIds = org.skills.map((s) => s.id);
const weakness = skillIds.map(() => rand() * 1.6 - 0.8);
for (const [index, rep] of reps.entries()) {
  const base = skillIds.map((_, i) => rep.level + weakness[i] + (rand() - 0.5) * 1.2);
  const rounds = index === 2 ? [80] : index === 6 ? [75, 38] : [82, 45, 9 + index];
  for (const [r, days] of rounds.entries()) {
    const gain = r * 0.35;
    const scores = {};
    skillIds.forEach((id, i) => {
      if (rand() < 0.12) return; // quelques sous-compétences non évaluées
      scores[id] = clamp(base[i] + gain + (rand() - 0.6) * 0.8);
    });
    await evaluation(
      org,
      rep.id,
      rep.coach,
      rep.coachMember,
      days,
      scores,
      "manager",
      r === rounds.length - 1
        ? `${rep.first} progresse bien sur l'accueil. Prochaine étape : la découverte des besoins.`
        : null,
    );
  }
  if (index % 2 === 0) {
    const scores = {};
    skillIds.forEach((id, i) => {
      scores[id] = clamp(base[i] + 1 + (rand() - 0.3));
    });
    await evaluation(org, rep.id, rep.userId, rep.id, 20, scores, "self");
  }
}
// Un brouillon en cours chez Julien.
await evaluation(
  org,
  reps[1].id,
  julienId,
  julien,
  null,
  Object.fromEntries(skillIds.slice(0, 12).map((id) => [id, 3])),
);
console.log("→ évaluations : 3 mois d'historique");

// Coachings dans tous les statuts.
const s = (i) => skillIds[i % skillIds.length];
const closedSpecs = [
  [0, 60, [0, 1], [2, 2]],
  [0, 18, [2, 5], [3, 2]],
  [1, 25, [5, 6], [3, 3]],
  [3, 12, [9, 10], [4, 3]],
  [4, 40, [0, 3], [1, 2]],
  [5, 15, [4, 8], [3, 2]],
  [7, 30, [12, 13], [2, 3]],
];
const closedIds = [];
for (const [r, days, sk, observed] of closedSpecs) {
  const rep = reps[r];
  const id = await coaching(org, {
    subject: rep.id,
    coach: rep.coach,
    coachMember: rep.coachMember,
    at: daysAgo(days),
    objective: "Travailler l'accueil et la découverte des besoins sur les clients du samedi",
    status: "cloture",
    closeAfterHours: r === 4 ? 96 : 20,
    skills: sk.map(s),
    observed,
    observedComments: [
      "Bon sourire, accueil en moins de 20 secondes sur 4 clients sur 5.",
      "Questions encore trop fermées.",
    ],
    repComment: r === 0 && days === 60 ? "Merci, je m'entraîne sur les questions ouvertes." : null,
    report: {
      context: "Samedi matin, forte affluence au showroom. 6 clients rencontrés, dont 2 reprises.",
      strengths: `${rep.first} crée facilement le contact et connaît très bien la gamme.`,
      improvements:
        "Reformuler le besoin avant de présenter un véhicule. Moins parler, plus questionner.",
      action_plan: [],
    },
  });
  closedIds.push([id, rep]);
}
// À rédiger (passés, non clôturés) et à venir.
await coaching(org, {
  subject: reps[2].id,
  coach: julienId,
  coachMember: julien,
  at: daysAgo(4),
  objective: "Premier coaching terrain de Tom",
  status: "planifie",
  skills: [s(0), s(1)],
});
await coaching(org, {
  subject: reps[6].id,
  coach: sarahId,
  coachMember: sarah,
  at: daysAgo(2, 14),
  objective: "Traitement des objections prix",
  status: "planifie",
  skills: [s(20)],
  mode: "distance",
  location: "Visio",
});
await coaching(org, {
  subject: reps[1].id,
  coach: julienId,
  coachMember: julien,
  at: daysAgo(-2),
  objective: "Conclure plus tôt",
  status: "planifie",
  skills: [s(25), s(26)],
});
await coaching(org, {
  subject: reps[4].id,
  coach: sarahId,
  coachMember: sarah,
  at: daysAgo(-5, 14),
  objective: "Préparer ses rendez-vous",
  status: "planifie",
  skills: [s(30)],
});
await coaching(org, {
  subject: reps[7].id,
  coach: sarahId,
  coachMember: sarah,
  at: daysAgo(-9),
  objective: "Reprise et financement",
  status: "planifie",
  skills: [s(15), s(16)],
});
await coaching(org, {
  subject: reps[5].id,
  coach: sarahId,
  coachMember: sarah,
  at: daysAgo(6),
  objective: "Essai routier",
  status: "annule",
  cancelReason: "Emma en formation constructeur",
  skills: [s(11)],
});
console.log("→ coachings : clôturés, à rédiger, à venir, annulé");

// Demandes de coaching.
const requestSpecs = [
  [
    reps[3],
    "J'aimerais travailler les objections sur le prix, je perds des ventes en fin de négociation.",
    [20, 21],
    "en_attente",
  ],
  [
    reps[5],
    "Je bloque sur la reprise : les clients trouvent toujours l'estimation trop basse.",
    [15],
    "en_attente",
  ],
  [reps[0], "Un coaching sur le closing ?", [25], "refusee"],
];
for (const [rep, message, sks, status] of requestSpecs) {
  const req = await must(
    db
      .from("coaching_requests")
      .insert({
        organization_id: org.id,
        requester_membership_id: rep.id,
        message,
        status,
        answer:
          status === "refusee"
            ? "On en parle à l'entretien de vendredi, je te propose un Dojo collectif d'abord."
            : null,
        answered_by: status === "refusee" ? rep.coach : null,
        answered_at: status === "refusee" ? daysAgo(3) : null,
        created_at: daysAgo(status === "refusee" ? 5 : 1),
      })
      .select("id")
      .single(),
    "demande",
  );
  await must(
    db
      .from("coaching_request_skills")
      .insert(sks.map((i) => ({ request_id: req.id, skill_id: s(i), organization_id: org.id }))),
    "compétences de la demande",
  );
}

// Plans de progrès : actions issues des coachings et ajoutées, certaines en retard.
const actionTitles = [
  ["Saluer chaque client en moins de 20 secondes", -6, "a_faire"],
  ["Poser 3 questions ouvertes avant toute présentation", 5, "en_cours"],
  ["Reformuler le besoin à voix haute", -12, "faite"],
  ["Proposer systématiquement un essai", 12, "a_faire"],
];
for (const [index, [coachingId, rep]] of closedIds.entries()) {
  const rows = actionTitles.slice(0, 2 + (index % 3)).map(([title, due, status], i) => ({
    organization_id: org.id,
    subject_membership_id: rep.id,
    title,
    due_date: dateOnly(due - i * 2),
    status,
    source: "coaching",
    coaching_id: coachingId,
    skill_id: s(i),
    created_by: rep.coach,
    done_at: status === "faite" ? daysAgo(5) : null,
  }));
  await must(db.from("actions").insert(rows), "actions");
}
await must(
  db.from("actions").insert([
    {
      organization_id: org.id,
      subject_membership_id: reps[0].id,
      title: "Relire la fiche « Financement LOA »",
      due_date: dateOnly(3),
      status: "a_faire",
      source: "manuelle",
      created_by: reps[0].userId,
    },
    {
      organization_id: org.id,
      subject_membership_id: reps[2].id,
      title: "Revoir la fiche produit du nouveau SUV",
      due_date: dateOnly(-3),
      status: "a_faire",
      source: "manuelle",
      created_by: julienId,
    },
  ]),
  "actions ajoutées",
);
console.log("→ plans de progrès, demandes");

// Séances de Dojo.
const dojos = await must(
  db
    .from("dojos")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("status", "valide")
    .limit(2),
  "dojos",
);
for (const [i, dojo] of dojos.entries()) {
  const session = await must(
    db
      .from("dojo_sessions")
      .insert({
        organization_id: org.id,
        dojo_id: dojo.id,
        coach_user_id: i === 0 ? julienId : sarahId,
        held_on: dateOnly(-7 - i * 10),
        scenario: 1 + i,
        went_well: "Bonne énergie, chacun a joué le client et le vendeur.",
        priority_axis: "Laisser des silences après les questions.",
        commitment: "Appliquer la technique sur les 3 prochains clients.",
      })
      .select("id")
      .single(),
    "séance",
  );
  const participants = reps.filter((r) => (i === 0 ? r.team === nord : r.team === sud)).slice(0, 3);
  await must(
    db.from("dojo_session_participants").insert(
      participants.map((p) => ({
        session_id: session.id,
        membership_id: p.id,
        organization_id: org.id,
      })),
    ),
    "participants",
  );
}

// Notes privées et journal.
await must(
  db.from("manager_notes").insert([
    {
      organization_id: org.id,
      subject_membership_id: reps[0].id,
      author_user_id: julienId,
      body: "Très motivé depuis le dernier coaching. Pense à le féliciter en réunion d'équipe.",
    },
    {
      organization_id: org.id,
      subject_membership_id: reps[2].id,
      author_user_id: julienId,
      body: "En période d'essai jusqu'à fin janvier : point mensuel prévu.",
    },
  ]),
  "notes privées",
);
await must(
  db.from("audit_log").insert([
    {
      organization_id: org.id,
      actor_user_id: claireId,
      action: "auth.login",
      created_at: daysAgo(1, 8),
    },
    {
      organization_id: org.id,
      actor_user_id: julienId,
      action: "coaching.closed",
      target_type: "coaching",
      created_at: daysAgo(12, 18),
    },
    {
      organization_id: org.id,
      actor_user_id: sarahId,
      action: "evaluation.validated",
      target_type: "evaluation",
      details: { kind: "manager" },
      created_at: daysAgo(9, 17),
    },
    {
      organization_id: org.id,
      actor_user_id: claireId,
      action: "invitation.created",
      details: { email: "nouveau@demo.local", role: "sales_rep" },
      created_at: daysAgo(20, 10),
    },
  ]),
  "journal",
);

// Seconde entreprise, pour l'isolation.
const b2b = await organization("Démo Services B2B", "demo-services-b2b", "Vente — socle général");
const marcId = await user("marc.girard@demo.local", "Marc", "Girard");
const marc = await member(b2b.id, marcId, "manager");
const teamB = (
  await must(
    db
      .from("teams")
      .insert({ organization_id: b2b.id, name: "Grands comptes" })
      .select("id")
      .single(),
    "équipe",
  )
).id;
await must(
  db.from("team_managers").insert({ team_id: teamB, membership_id: marc, organization_id: b2b.id }),
  "manager",
);
for (const [login, first, last] of [
  ["lucas.roux", "Lucas", "Roux"],
  ["sofia.blanc", "Sofia", "Blanc"],
  ["nina.garnier", "Nina", "Garnier"],
]) {
  const id = await user(`${login}@demo.local`, first, last);
  const m = await member(b2b.id, id, "sales_rep", { team_id: teamB });
  await evaluation(
    b2b,
    m,
    marcId,
    marc,
    30,
    Object.fromEntries(b2b.skills.map((sk) => [sk.id, clamp(1 + rand() * 3)])),
  );
}
console.log("→ Démo Services B2B : 4 personnes");
console.log(
  "✓ Données de démonstration prêtes. Super admin : admin@demo.local (connexion par code).",
);
