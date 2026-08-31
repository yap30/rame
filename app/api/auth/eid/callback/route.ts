import { NextRequest, NextResponse } from "next/server";
import { getOAuth } from "@/lib/eid";
import { findOrCreateUserByEid, issueSession } from "@/lib/auth";
import { SESSION_COOKIE, isSecureRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth SSO e.id (langkah 3-5):
 * terima one-time code -> tukar dengan token server-side ->
 * baca profil -> link/upsert user -> buat session RAME.
 * Client secret tidak pernah menyentuh browser (blueprint §6).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get("rame_oauth_state")?.value;
  const next = req.cookies.get("rame_oauth_next")?.value ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=error", req.url));
  }
  if (expectedState && state && state !== expectedState) {
    return NextResponse.redirect(new URL("/?auth=state_mismatch", req.url));
  }

  try {
    const { profile } = await getOAuth().exchangeCode(code);
    const { user, orgId } = await findOrCreateUserByEid(profile);
    const token = await issueSession(user.id, user.role, orgId);

    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete("rame_oauth_state");
    res.cookies.delete("rame_oauth_next");
    return res;
  } catch {
    return NextResponse.redirect(new URL("/?auth=error", req.url));
  }
}
