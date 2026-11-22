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
