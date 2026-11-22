import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  organizationId?: string | null;
  /** Pièces jointes (ex. invitation agenda .ics), contenu en texte. */
  attachments?: { filename: string; content: string; contentType: string }[];
};

export type EmailResult =
  { ok: true; mode: "envoye" | "redirige" | "simule" } | { ok: false; error: string };

/**
 * Envoi d'email via l'API Resend (§9).
 * - Sans RESEND_API_KEY : l'email est simulé (écrit dans les journaux du serveur).
 * - Avec DEV_EMAIL_REDIRECT : tout part vers cette adresse unique, jamais vers le vrai destinataire.
 * Chaque tentative est tracée dans email_log.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Première Ligne <notifications@premiereligne-app.fr>";
  const redirectTo = process.env.DEV_EMAIL_REDIRECT;

  let result: EmailResult;
  let providerId: string | null = null;

  if (!apiKey) {
    console.info(
      `[email simulé] à ${message.to} · ${message.subject}\n${message.text}\n— fin de l'email —`,
    );
    result = { ok: true, mode: "simule" };
  } else {
    const to = redirectTo || message.to;
    const subject = redirectTo ? `[pour ${message.to}] ${message.subject}` : message.subject;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: message.html,
          text: message.text,
          attachments: message.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "utf8").toString("base64"),
            content_type: a.contentType,
          })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (response.ok) {
        providerId = body.id ?? null;
        result = { ok: true, mode: redirectTo ? "redirige" : "envoye" };
      } else {
        result = { ok: false, error: body.message ?? `Erreur ${response.status}` };
      }
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
    }
  }

  try {
    await createServiceClient()
      .from("email_log")
      .insert({
        organization_id: message.organizationId ?? null,
        to_email: message.to,
        template: message.template,
        status: result.ok ? result.mode : "echec",
        provider_id: providerId,
        error: result.ok ? null : result.error,
      });
  } catch (error) {
    console.error("[email] journal impossible", error);
  }

  return result;
}
