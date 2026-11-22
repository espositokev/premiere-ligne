import "server-only";

import { z } from "zod";

/** Variables secrètes : uniquement côté serveur. L'import de "server-only" casse le build si un composant client les importe. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_URL: z.url(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  PREVIEW_COOKIE_SECRET: z.string().min(32).optional(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  DEV_EMAIL_REDIRECT: z.email().optional(),
});

export function serverEnv() {
  return serverSchema.parse(process.env);
}
