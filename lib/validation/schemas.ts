import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/domain/slug";

/** Schémas de validation partagés (§8.1 : toutes les entrées sont validées côté serveur). */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} : ${min === 1 ? "champ obligatoire" : `au moins ${min} caractères`}`)
    .max(max, `${label} : ${max} caractères maximum`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide"));

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Le code contient 6 chiffres");

export const roleSchema = z.enum(["org_admin", "manager", "sales_rep"], {
  error: "Rôle invalide",
});

export const uuidSchema = z.uuid("Identifiant invalide");

export const requestCodeSchema = z.object({ email: emailSchema });

export const verifyCodeSchema = z.object({ email: emailSchema, code: otpSchema });

export const profileSchema = z.object({
  first_name: trimmed(1, 80, "Prénom"),
  last_name: trimmed(1, 80, "Nom"),
  phone: optionalText(30),
});

export const organizationSchema = z.object({
  name: trimmed(2, 120, "Nom"),
  slug: z
    .string()
    .trim()
    .min(2, "Adresse : au moins 2 caractères")
    .max(60, "Adresse : 60 caractères maximum")
    .regex(SLUG_PATTERN, "Adresse : lettres minuscules, chiffres et tirets uniquement"),
});

export const organizationStatusSchema = z.enum(["actif", "suspendu", "archive"]);

export const invitationSchema = z
  .object({
    email: emailSchema,
    first_name: trimmed(1, 80, "Prénom"),
    last_name: trimmed(1, 80, "Nom"),
    role: roleSchema,
    team_id: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .transform((v) => v ?? null)
      .pipe(uuidSchema.nullable()),
    job_title: optionalText(80),
  })
  .superRefine((value, ctx) => {
    if (value.role === "sales_rep" && !value.team_id) {
      ctx.addIssue({
        code: "custom",
        path: ["team_id"],
        message: "Choisissez l'équipe du commercial",
      });
    }
    if (value.role !== "sales_rep" && value.team_id) {
      ctx.addIssue({
        code: "custom",
        path: ["team_id"],
        message: "Seul un commercial est rattaché à une équipe",
      });
    }
  });

export const acceptInvitationSchema = z.object({
  token: z.string().min(20).max(200),
  first_name: trimmed(1, 80, "Prénom"),
  last_name: trimmed(1, 80, "Nom"),
  accept_terms: z.literal("on", { error: "Vous devez accepter les conditions pour continuer" }),
});

export const memberUpdateSchema = z
  .object({
    role: roleSchema,
    team_id: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .transform((v) => v ?? null)
      .pipe(uuidSchema.nullable()),
    job_title: optionalText(80),
  })
  .superRefine((value, ctx) => {
    if (value.role === "sales_rep" && !value.team_id) {
      ctx.addIssue({
        code: "custom",
        path: ["team_id"],
        message: "Choisissez l'équipe du commercial",
      });
    }
  })
  .transform((value) => ({ ...value, team_id: value.role === "sales_rep" ? value.team_id : null }));

export const teamSchema = z.object({
  name: trimmed(1, 80, "Nom de l'équipe"),
  manager_ids: z.array(uuidSchema).max(20).default([]),
});

/** Transforme une erreur Zod en messages par champ, pour les formulaires. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
