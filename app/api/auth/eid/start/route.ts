import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOAuth } from "@/lib/eid";

export const dynamic = "force-dynamic";

/**
 * Langkah 2 alur OAuth SSO e.id:
 * redirect browser pengguna ke Verify Client e.id.
 * State disimpan di cookie httpOnly untuk validasi callback.
 */
export async function GET(req: NextRequest) {
  const state = randomUUID();
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  const authUrl = getOAuth().buildAuthorizeUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("rame_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  res.cookies.set("rame_oauth_next", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
