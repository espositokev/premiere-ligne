import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** Jeton d'invitation : 32 octets aléatoires, envoyé par email, jamais stocké en clair (§8.5). */
export function generateInvitationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
