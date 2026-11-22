import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";

/** Toutes les pages connectées : il faut un compte et avoir accepté les CGU (§14). */
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (!user.termsAcceptedAt) redirect("/bienvenue");
  return children;
}
