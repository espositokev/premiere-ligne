import { canAdministerOrg, type SpaceRole } from "./roles";

export type NavIcon =
  | "home"
  | "users"
  | "teams"
  | "team"
  | "progress"
  | "profile"
  | "matrix"
  | "dojo"
  | "settings"
  | "coaching"
  | "plan"
  | "history";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  /** Le lien est actif seulement sur son adresse exacte (sinon aussi sur ses sous-pages). */
  exact?: boolean;
};

/**
 * Entrées de navigation d'un espace entreprise selon le rôle.
 * Sur mobile, la barre d'onglets en affiche au plus 4 (§10.4) ; les suivantes passent dans le menu du compte.
 */
export function orgNavigation(slug: string, role: SpaceRole): NavItem[] {
  const base = `/e/${slug}`;

  if (role === "sales_rep") {
    return [
      { label: "Ma progression", href: `${base}/moi`, icon: "progress", exact: true },
      { label: "Mon plan", href: `${base}/moi/plan`, icon: "plan" },
      { label: "Coachings", href: `${base}/coachings`, icon: "coaching" },
      { label: "Dojos", href: `${base}/dojos`, icon: "dojo" },
      { label: "Profil", href: "/profil", icon: "profile" },
    ];
  }

  const items: NavItem[] = [
    { label: "Accueil", href: base, icon: "home", exact: true },
    {
      label: canAdministerOrg(role) ? "Commerciaux" : "Mon équipe",
      href: `${base}/equipe`,
      icon: "team",
    },
  ];

  items.push({ label: "Coachings", href: `${base}/coachings`, icon: "coaching" });
  items.push({ label: "Dojos", href: `${base}/dojos`, icon: "dojo" });
  if (!canAdministerOrg(role)) {
    // Les managers font aussi évoluer la matrice (le responsable y accède par Paramètres).
    items.push({ label: "Matrice", href: `${base}/parametres/referentiel`, icon: "matrix" });
  }

  if (canAdministerOrg(role)) {
    items.push({ label: "Paramètres", href: `${base}/parametres`, icon: "settings" });
  } else {
    items.push({ label: "Profil", href: "/profil", icon: "profile" });
  }

  return items;
}

export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Entrée active : celle dont l'adresse correspond le plus précisément à la page affichée. */
export function activeNavHref(
  items: Pick<NavItem, "href" | "exact">[],
  pathname: string,
): string | null {
  const matches = items.filter((item) => isNavItemActive(item, pathname));
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best)).href;
}

/** Page d'arrivée après connexion. */
export function homePathFor(input: {
  isSuperAdmin: boolean;
  spaces: { slug: string; role: SpaceRole }[];
}): string {
  if (input.isSuperAdmin) return "/admin";
  const [first, ...others] = input.spaces;
  if (!first) return "/espaces";
  if (others.length > 0) return "/espaces";
  return first.role === "sales_rep" ? `/e/${first.slug}/moi` : `/e/${first.slug}`;
}
