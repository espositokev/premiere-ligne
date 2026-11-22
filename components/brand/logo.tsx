import { cn } from "@/lib/utils";

type LogoProps = {
  /** "light" : sur fond clair (texte forêt). "dark" : sur fond forêt (texte os). */
  variant?: "light" | "dark";
  /** "full" : marque + nom. "mark" : marque seule (icône). */
  kind?: "full" | "mark";
  className?: string;
};

/**
 * Marque Première Ligne : trois marches qui montent, doublées d'une ombre fluo.
 * Le nom est écrit en Sora plutôt que dans le SVG, pour ne pas dépendre
 * des polices installées sur l'appareil.
 */
export function Logo({ variant = "light", kind = "full", className }: LogoProps) {
  const ink = variant === "light" ? "var(--pl-forest)" : "var(--pl-bone)";
  const text = variant === "light" ? "text-forest-deep" : "text-bone";

  const mark = (
    <svg
      viewBox="0 0 64 48"
      className={kind === "full" ? "h-full w-auto shrink-0" : "h-full w-auto"}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="35" width="16" height="6" fill="var(--pl-fluo)" />
      <rect x="25" y="25" width="16" height="12" fill="var(--pl-fluo)" />
      <rect x="43" y="11" width="20" height="20" fill="var(--pl-fluo)" />
      <rect x="4" y="32" width="16" height="6" fill={ink} />
      <rect x="22" y="22" width="16" height="12" fill={ink} />
      <rect x="40" y="8" width="20" height="20" fill={ink} />
    </svg>
  );

  if (kind === "mark") {
    return (
      <span role="img" aria-label="Première Ligne" className={cn("inline-flex h-8", className)}>
        {mark}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="Première Ligne"
      className={cn("inline-flex h-9 items-center gap-2", className)}
    >
      {mark}
      <span
        className={cn(
          "font-display text-[0.95em] leading-[0.95] font-extrabold tracking-tight uppercase",
          text,
        )}
        aria-hidden="true"
      >
        Première
        <br />
        Ligne
      </span>
    </span>
  );
}
