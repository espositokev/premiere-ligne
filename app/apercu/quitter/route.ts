import { NextResponse, type NextRequest } from "next/server";

import { PREVIEW_COOKIE } from "@/lib/auth/preview";

/** Quitter un « voir en tant que » : on efface le cookie et on revient à sa propre vue. */
export async function GET(request: NextRequest) {
  const back = request.nextUrl.searchParams.get("retour");
  const target = back && back.startsWith("/") && !back.startsWith("//") ? back : "/espaces";
  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.delete(PREVIEW_COOKIE);
  return response;
}
