import { ROLE_LABELS } from "@/lib/domain/roles";
import { INVITATION_VALIDITY_DAYS } from "@/lib/domain/invitations";
import type { OrgRole } from "@/lib/supabase/types";

/** Échappe le texte inséré dans le HTML d'un email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Gabarit commun aux couleurs Première Ligne, lisible même sans images. */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#072820;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e4dc;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0b3d2e;padding:20px 28px;">
          <span style="display:inline-block;width:28px;height:6px;background:#d4ff3a;vertical-align:middle;margin-right:10px;"></span>
          <span style="color:#f4f2ee;font-weight:800;font-size:16px;letter-spacing:0.5px;vertical-align:middle;">PREMIÈRE LIGNE</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#072820;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e8e4dc;font-size:12px;color:#5f635d;">
          Première Ligne · On forme là où ça se joue.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#d4ff3a;color:#072820;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

export function invitationEmail(input: {
  firstName: string;
  organizationName: string;
  role: OrgRole;
  inviterName: string | null;
  link: string;
}) {
  const roleLabel = ROLE_LABELS[input.role].toLowerCase();
  const by = input.inviterName ? `${input.inviterName} vous invite` : "Vous êtes invité";
  const subject = `${input.organizationName} vous invite sur Première Ligne`;
  const html = layout(
    `Bonjour ${input.firstName},`,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${escapeHtml(by)} à rejoindre l'espace <strong>${escapeHtml(input.organizationName)}</strong> sur Première Ligne, en tant que ${escapeHtml(roleLabel)}.</p>
     <p style="margin:0;font-size:16px;line-height:1.5;">Première Ligne vous aide à suivre la progression de l'équipe commerciale : évaluations, coachings et plans d'action.</p>
     ${button(input.link, "Rejoindre l'espace")}
     <p style="margin:0;font-size:13px;line-height:1.5;color:#5f635d;">Ce lien est personnel et valable ${INVITATION_VALIDITY_DAYS} jours. Si vous n'attendiez pas cette invitation, ignorez simplement cet email.</p>`,
  );
  const text = `Bonjour ${input.firstName},

${by} à rejoindre l'espace ${input.organizationName} sur Première Ligne, en tant que ${roleLabel}.

Pour accepter, ouvrez ce lien (personnel, valable ${INVITATION_VALIDITY_DAYS} jours) :
${input.link}

Si vous n'attendiez pas cette invitation, ignorez simplement cet email.

Première Ligne · On forme là où ça se joue.`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Coachings (§9) — tutoiement pour le commercial, vouvoiement pour le manager
// ---------------------------------------------------------------------------

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${text}</p>`;
}

function details(rows: [string, string | null | undefined][]): { html: string; text: string } {
  const kept = rows.filter((row): row is [string, string] => Boolean(row[1]));
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;font-size:15px;line-height:1.5;">${kept
      .map(
        ([label, value]) =>
          `<tr><td style="padding:2px 12px 2px 0;color:#5f635d;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:2px 0;font-weight:700;">${escapeHtml(value)}</td></tr>`,
      )
      .join("")}</table>`,
    text: kept.map(([label, value]) => `${label} : ${value}`).join("\n"),
  };
}

const SIGNATURE = "Première Ligne · On forme là où ça se joue.";

export function coachingPlannedEmail(input: {
  firstName: string;
  coachName: string;
  when: string;
  mode: string;
  location: string | null;
  objective: string | null;
  skills: string[];
  link: string;
  updated: boolean;
  fromRequest: boolean;
}) {
  const subject = input.updated
    ? `Ton coaching avec ${input.coachName} a été modifié`
    : `Coaching prévu avec ${input.coachName}`;
  const intro = input.updated
    ? `${input.coachName} a modifié votre coaching. Voici les nouvelles informations :`
    : input.fromRequest
      ? `Bonne nouvelle : ${input.coachName} a accepté ta demande et planifié un coaching.`
      : `${input.coachName} a planifié un coaching avec toi.`;
  const info = details([
    ["Quand", input.when],
    ["Format", input.mode],
    ["Lieu", input.location],
    ["Objectif", input.objective],
    ["Compétences", input.skills.join(", ") || null],
  ]);
  const html = layout(
    `Salut ${input.firstName} !`,
    `${paragraph(escapeHtml(intro))}${info.html}
     ${button(input.link, "Voir le coaching")}
     <p style="margin:0;font-size:13px;line-height:1.5;color:#5f635d;">L'invitation jointe s'ajoute à ton agenda en un clic.</p>`,
  );
  const text = `Salut ${input.firstName} !

${intro}

${info.text}

Voir le coaching : ${input.link}

${SIGNATURE}`;
  return { subject, html, text };
}

export function coachingCancelledEmail(input: {
  firstName: string;
  coachName: string;
  when: string;
  reason: string;
}) {
  const subject = `Coaching du ${input.when} annulé`;
  const html = layout(
    `Salut ${input.firstName},`,
    `${paragraph(`${escapeHtml(input.coachName)} a annulé le coaching prévu le <strong>${escapeHtml(input.when)}</strong>.`)}
     ${paragraph(`Motif : ${escapeHtml(input.reason)}`)}`,
  );
  const text = `Salut ${input.firstName},

${input.coachName} a annulé le coaching prévu le ${input.when}.
Motif : ${input.reason}

${SIGNATURE}`;
  return { subject, html, text };
}

export function coachingReportEmail(input: {
  firstName: string;
  coachName: string;
  when: string;
  actionCount: number;
  link: string;
}) {
  const subject = `Le compte rendu de ton coaching du ${input.when} est disponible`;
  const actions =
    input.actionCount > 0
      ? `${input.actionCount} action${input.actionCount > 1 ? "s ont été ajoutées" : " a été ajoutée"} à ton plan de progrès.`
      : "";
  const html = layout(
    `Salut ${input.firstName} !`,
    `${paragraph(`${escapeHtml(input.coachName)} a rédigé le compte rendu de votre coaching du ${escapeHtml(input.when)} : points forts, axes de progrès et prochaines étapes.`)}
     ${actions ? paragraph(escapeHtml(actions)) : ""}
     ${button(input.link, "Lire le compte rendu")}
     <p style="margin:0;font-size:13px;line-height:1.5;color:#5f635d;">Tu peux y ajouter ton commentaire.</p>`,
  );
  const text = `Salut ${input.firstName} !

${input.coachName} a rédigé le compte rendu de votre coaching du ${input.when}.
${actions}

Lire le compte rendu : ${input.link}

${SIGNATURE}`;
  return { subject, html, text };
}

export function coachingRequestEmail(input: {
  managerFirstName: string;
  repName: string;
  message: string | null;
  skills: string[];
  link: string;
}) {
  const subject = `${input.repName} demande un coaching`;
  const info = details([
    ["Compétences", input.skills.join(", ") || null],
    ["Message", input.message],
  ]);
  const html = layout(
    `Bonjour ${input.managerFirstName},`,
    `${paragraph(`<strong>${escapeHtml(input.repName)}</strong> vous demande un coaching.`)}${info.html}
     ${button(input.link, "Répondre à la demande")}`,
  );
  const text = `Bonjour ${input.managerFirstName},

${input.repName} vous demande un coaching.
${info.text}

Répondre : ${input.link}

${SIGNATURE}`;
  return { subject, html, text };
}

export function requestDeclinedEmail(input: {
  firstName: string;
  managerName: string;
  answer: string;
  link: string;
}) {
  const subject = "Réponse à ta demande de coaching";
  const html = layout(
    `Salut ${input.firstName},`,
    `${paragraph(`${escapeHtml(input.managerName)} a répondu à ta demande de coaching :`)}
     <blockquote style="margin:0 0 12px;padding:12px 16px;background:#f4f2ee;border-radius:8px;font-size:15px;line-height:1.5;">${escapeHtml(input.answer)}</blockquote>
     ${button(input.link, "Voir mes coachings")}`,
  );
  const text = `Salut ${input.firstName},

${input.managerName} a répondu à ta demande de coaching :
« ${input.answer} »

Voir mes coachings : ${input.link}

${SIGNATURE}`;
  return { subject, html, text };
}

export function reportReminderEmail(input: {
  firstName: string;
  items: { repName: string; when: string; days: number; link: string }[];
}) {
  const count = input.items.length;
  const subject =
    count > 1
      ? `${count} comptes rendus de coaching à rédiger`
      : "Un compte rendu de coaching à rédiger";
  const list = input.items
    .map(
      (i) =>
        `<li style="margin:0 0 8px;"><a href="${escapeHtml(i.link)}" style="color:#0b3d2e;font-weight:700;">${escapeHtml(i.repName)}</a> — ${escapeHtml(i.when)} (il y a ${i.days} jour${i.days > 1 ? "s" : ""})</li>`,
    )
    .join("");
  const html = layout(
    `Bonjour ${input.firstName},`,
    `${paragraph("Ces coachings attendent leur compte rendu. Quelques minutes suffisent, et votre commercial pourra le lire et avancer sur son plan d'action.")}
     <ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.5;">${list}</ul>`,
  );
  const text = `Bonjour ${input.firstName},

Ces coachings attendent leur compte rendu :
${input.items.map((i) => `- ${i.repName}, ${i.when} : ${i.link}`).join("\n")}

${SIGNATURE}`;
  return { subject, html, text };
}
