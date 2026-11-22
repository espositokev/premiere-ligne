import { AppShell, type ShellNavItem } from "@/components/layout/app-shell";
import { getMySpaces, requireSuperAdmin } from "@/lib/auth/current-user";

const NAV: ShellNavItem[] = [
  { label: "Tableau de bord", href: "/admin", icon: "home", exact: true },
  { label: "Entreprises", href: "/admin/entreprises", icon: "building" },
  { label: "Profil", href: "/profil", icon: "profile" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireSuperAdmin();
  const spaces = await getMySpaces();
  return (
    <AppShell
      nav={NAV}
      contextLabel="Administration"
      userName={`${user.firstName} ${user.lastName}`}
      showSpacesLink={spaces.length > 0}
    >
      {children}
    </AppShell>
  );
}
