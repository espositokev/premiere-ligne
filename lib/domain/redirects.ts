/**
 * N'accepte qu'un chemin interne (« /e/acme ») comme destination après connexion,
 * pour qu'un lien piégé ne puisse pas renvoyer vers un autre site.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.length > 300) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith("/connexion")) return null;
  return value;
}
